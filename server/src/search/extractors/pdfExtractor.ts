import { PDFParse } from 'pdf-parse';
import { countWords } from '../textNormalizer';
import { DocumentType, ExtractionResult } from '../searchTypes';
import { extractPdfPageOcr } from './ocrExtractor';

type PdfExtractionResult = ExtractionResult & {
  type: DocumentType;
  pages: number;
};

/**
 * Extracts digital PDF text and falls back to OCR when digital text is sparse.
 */
export async function extractPdf(file: Buffer): Promise<PdfExtractionResult> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(file) });
    const parsed = await parser.getText({ pageJoiner: '' });
    const digitalText = parsed.text || '';
    const digitalWords = countWords(digitalText);
    const pages = parsed.total || 1;

    if (digitalWords >= 30) {
      return { text: digitalText, wordCount: digitalWords, pages, type: 'digital' };
    }

    const ocrParts: string[] = [];
    let ocrWords = 0;

    for (let page = 0; page < pages; page += 1) {
      const ocr = await extractPdfPageOcr(file, page);
      if (ocr.text) ocrParts.push(ocr.text);
      ocrWords += ocr.wordCount;
    }

    const combinedText = [digitalText, ...ocrParts].filter(Boolean).join('\n\n');
    const totalWords = digitalWords + ocrWords;
    const type: DocumentType = digitalWords >= 5 && ocrWords > 0
      ? 'hybrid'
      : digitalWords > 30
        ? 'digital'
        : 'ocr';

    return { text: combinedText, wordCount: totalWords, pages, type };
  } catch {
    return { text: '', wordCount: 0, pages: 0, type: 'ocr' };
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}
