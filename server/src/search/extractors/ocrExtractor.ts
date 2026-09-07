import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { createWorker, Worker } from 'tesseract.js';
import { countWords } from '../textNormalizer';
import { ExtractionResult } from '../searchTypes';

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker({});
      await worker.loadLanguage('por+eng');
      await worker.initialize('por+eng');
      return worker;
    })();
  }
  return workerPromise;
}

function terminateWorker(): void {
  if (!workerPromise) return;
  workerPromise
    .then(worker => worker.terminate())
    .catch(() => undefined);
}

process.once('exit', terminateWorker);
process.once('SIGINT', () => {
  terminateWorker();
  process.exit(130);
});
process.once('SIGTERM', () => {
  terminateWorker();
  process.exit(143);
});

/**
 * Runs OCR on an image buffer using a singleton Tesseract worker.
 */
export async function extractOcr(file: Buffer): Promise<ExtractionResult> {
  let tempPath: string | null = null;
  try {
    tempPath = await normalizeImageForOcr(file);
    const worker = await getWorker();
    const result = await worker.recognize(tempPath);
    const text = result.data.text || '';
    return { text, wordCount: countWords(text), pages: 1 };
  } catch {
    return { text: '', wordCount: 0, pages: 0 };
  } finally {
    if (tempPath) {
      await fs.promises.unlink(tempPath).catch(() => undefined);
    }
  }
}

async function normalizeImageForOcr(file: Buffer): Promise<string> {
  const tempPath = path.join(os.tmpdir(), `sigad-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  await sharp(file, { failOn: 'none' })
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .png({ compressionLevel: 6 })
    .toFile(tempPath);
  return tempPath;
}

/**
 * Rasterizes one PDF page to PNG and extracts text with OCR.
 */
export async function extractPdfPageOcr(file: Buffer, page = 0): Promise<ExtractionResult> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(file) });
    try {
      const screenshot = await parser.getScreenshot({
        partial: [page + 1],
        desiredWidth: 1800,
        imageBuffer: true,
        imageDataUrl: false
      });
      const image = screenshot.pages[0]?.data;
      if (!image) return { text: '', wordCount: 0, pages: 0 };
      return extractOcr(Buffer.from(image));
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  } catch {
    return { text: '', wordCount: 0, pages: 0 };
  }
}
