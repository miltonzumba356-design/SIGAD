import sharp from 'sharp';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'webp']);

/**
 * Aplica marca d'água diagonal repetida a um PDF ou imagem.
 * Para outros tipos de ficheiro (ex: docx, txt), devolve o buffer original,
 * já que não há forma segura de marcar o conteúdo sem alterar o formato.
 */
export async function applyWatermark(file: Buffer, mimeType: string, ext: string, label: string): Promise<Buffer> {
  const extension = ext.toLowerCase().replace(/^\./, '');

  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return watermarkPdf(file, label);
  }
  if (imageExtensions.has(extension) || mimeType.startsWith('image/')) {
    return watermarkImage(file, label);
  }
  return file;
}

async function watermarkPdf(file: Buffer, label: string): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(file, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 22;

    for (const page of pdfDoc.getPages()) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(label, fontSize);
      const stepX = textWidth + 120;
      const stepY = 140;

      for (let y = -height * 0.5; y < height * 1.5; y += stepY) {
        for (let x = -width * 0.5; x < width * 1.5; x += stepX) {
          page.drawText(label, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.55, 0.55, 0.55),
            opacity: 0.28,
            rotate: degrees(45)
          });
        }
      }
    }

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  } catch (error) {
    console.error('[Watermark] Falha ao marcar PDF, a devolver ficheiro original:', error instanceof Error ? error.message : error);
    return file;
  }
}

async function watermarkImage(file: Buffer, label: string): Promise<Buffer> {
  try {
    const image = sharp(file, { failOn: 'none' });
    const metadata = await image.metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    const safeLabel = label.replace(/[<&>]/g, char => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[char] || char));
    const tileSize = Math.max(240, Math.round(width / 4));
    const rows: string[] = [];
    for (let y = 0; y < height + tileSize; y += tileSize) {
      for (let x = 0; x < width + tileSize; x += tileSize) {
        rows.push(`<text x="${x}" y="${y}" font-size="20" fill="rgba(120,120,120,0.35)" font-family="sans-serif" transform="rotate(-30 ${x} ${y})">${safeLabel}</text>`);
      }
    }
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${rows.join('')}</svg>`;

    const watermarked = await image
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .toBuffer();
    return watermarked;
  } catch (error) {
    console.error('[Watermark] Falha ao marcar imagem, a devolver ficheiro original:', error instanceof Error ? error.message : error);
    return file;
  }
}
