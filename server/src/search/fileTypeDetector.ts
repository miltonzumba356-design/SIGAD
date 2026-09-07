import { PDFParse } from 'pdf-parse';
import { DocumentType } from './searchTypes';
import { countWords } from './textNormalizer';

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'webp']);
const digitalExtensions = new Set(['txt', 'docx']);

/**
 * Detects if a document is digital, OCR-only, or hybrid.
 */
export async function detectFileType(file: Buffer, ext: string): Promise<DocumentType> {
  const normalizedExt = ext.toLowerCase().replace(/^\./, '');

  if (normalizedExt === 'pdf') {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: new Uint8Array(file) });
      const parsed = await parser.getText({ pageJoiner: '' });
      const wordCount = countWords(parsed.text || '');
      if (wordCount > 30) return 'digital';
      if (wordCount >= 5) return 'hybrid';
      return 'ocr';
    } catch {
      return 'ocr';
    } finally {
      await parser?.destroy().catch(() => undefined);
    }
  }

  if (imageExtensions.has(normalizedExt)) return 'ocr';
  if (digitalExtensions.has(normalizedExt)) return 'digital';

  return 'digital';
}
