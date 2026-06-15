import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type ScanResult = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
};

export type ScannerDevice = {
  id: string;
  name: string;
};

function scannerUrl(ip: string, path: string): string {
  const base = ip.startsWith('http://') || ip.startsWith('https://') ? ip.replace(/\/$/, '') : `http://${ip}`;
  return `${base}${path}`;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Starts an eSCL/AirScan scan job and returns the first scanned document.
 */
export async function scanFromEscanner(ip: string): Promise<ScanResult> {
  const jobXml = `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03">
  <pwg:Version xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">2.0</pwg:Version>
  <scan:Intent>Document</scan:Intent>
  <pwg:ScanRegions xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
    <pwg:ScanRegion>
      <pwg:Height>3508</pwg:Height>
      <pwg:Width>2480</pwg:Width>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">Platen</pwg:InputSource>
  <scan:ColorMode>RGB24</scan:ColorMode>
  <scan:XResolution>300</scan:XResolution>
  <scan:YResolution>300</scan:YResolution>
  <pwg:DocumentFormat xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">application/pdf</pwg:DocumentFormat>
</scan:ScanSettings>`;

  const createJob = await fetchWithTimeout(scannerUrl(ip, '/eSCL/ScanJobs'), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      Accept: 'application/pdf,image/jpeg,image/png'
    },
    body: jobXml
  }, 30000);

  if (!createJob.ok) {
    throw new Error(`SCANNER_JOB_FAILED:${createJob.status}`);
  }

  const location = createJob.headers.get('location');
  if (!location) {
    throw new Error('SCANNER_NO_JOB_LOCATION');
  }

  const documentUrl = location.startsWith('http')
    ? `${location.replace(/\/$/, '')}/NextDocument`
    : scannerUrl(ip, `${location.replace(/\/$/, '')}/NextDocument`);

  const scanned = await fetchWithTimeout(documentUrl, {
    headers: { Accept: 'application/pdf,image/jpeg,image/png' }
  }, 120000);

  if (!scanned.ok) {
    throw new Error(`SCANNER_DOCUMENT_FAILED:${scanned.status}`);
  }

  const mimeType = scanned.headers.get('content-type')?.split(';')[0] || 'application/pdf';
  const arrayBuffer = await scanned.arrayBuffer();
  const extension = mimeType.includes('jpeg') ? '.jpg' : mimeType.includes('png') ? '.png' : '.pdf';

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
    extension
  };
}

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script
  ], {
    windowsHide: true,
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 4
  });
  return stdout;
}

/**
 * Lists scanners installed in Windows through WIA, including WSD/IP_SCAN devices.
 */
export async function listWindowsWiaScanners(): Promise<ScannerDevice[]> {
  if (process.platform !== 'win32') return [];

  const script = `
    $dm = New-Object -ComObject WIA.DeviceManager
    $items = @()
    foreach ($info in $dm.DeviceInfos) {
      if ($info.Type -eq 1) {
        $name = ''
        foreach ($prop in $info.Properties) {
          if ($prop.Name -eq 'Name') { $name = [string]$prop.Value }
        }
        $items += [pscustomobject]@{ id = [string]$info.DeviceID; name = $name }
      }
    }
    $items | ConvertTo-Json -Compress
  `;

  const output = (await runPowerShell(script)).trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

/**
 * Scans one page using the Windows WIA driver. This supports many HP WSD/IP_SCAN scanners.
 */
export async function scanFromWindowsWia(identifier?: string): Promise<ScanResult> {
  if (process.platform !== 'win32') {
    throw new Error('WIA_ONLY_WINDOWS');
  }

  const outFile = path.join(os.tmpdir(), `sigad-scan-${Date.now()}.jpg`);
  const safeIdentifier = (identifier || '').replace(/'/g, "''");
  const safeOut = outFile.replace(/'/g, "''");

  const script = `
    $identifier = '${safeIdentifier}'
    $out = '${safeOut}'
    $dm = New-Object -ComObject WIA.DeviceManager
    $selected = $null
    foreach ($info in $dm.DeviceInfos) {
      if ($info.Type -ne 1) { continue }
      $name = ''
      foreach ($prop in $info.Properties) {
        if ($prop.Name -eq 'Name') { $name = [string]$prop.Value }
      }
      if ([string]::IsNullOrWhiteSpace($identifier) -or $name -like "*$identifier*" -or [string]$info.DeviceID -like "*$identifier*") {
        $selected = $info
        break
      }
    }
    if ($null -eq $selected) { throw 'SCANNER_NOT_FOUND' }
    $device = $selected.Connect()
    $item = $device.Items.Item(1)
    $jpeg = '{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}'
    $image = $item.Transfer($jpeg)
    if (Test-Path $out) { Remove-Item -LiteralPath $out -Force }
    $image.SaveFile($out)
    Write-Output $out
  `;

  const output = (await runPowerShell(script)).trim().split(/\r?\n/).pop();
  if (!output || !fs.existsSync(output)) {
    throw new Error('WIA_SCAN_FAILED');
  }

  const buffer = await fs.promises.readFile(output);
  await fs.promises.unlink(output).catch(() => undefined);
  return { buffer, mimeType: 'image/jpeg', extension: '.jpg' };
}

/**
 * Attempts eSCL by IP first, then falls back to local Windows WIA/WSD.
 */
export async function scanFromDevice(identifier: string): Promise<ScanResult> {
  try {
    return await scanFromEscanner(identifier);
  } catch {
    return scanFromWindowsWia(identifier);
  }
}
