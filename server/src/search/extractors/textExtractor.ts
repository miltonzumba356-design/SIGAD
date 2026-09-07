import mammoth from 'mammoth';
import { countWords } from '../textNormalizer';
import { ExtractionResult } from '../searchTypes';

/**
 * Extracts text from plain TXT and DOCX files.
 */
export async function extractText(file: Buffer, ext: string): Promise<ExtractionResult> {
  try {
    const normalizedExt = ext.toLowerCase().replace(/^\./, '');
    const text = normalizedExt === 'docx'
      ? (await mammoth.extractRawText({ buffer: file })).value
      : file.toString('utf8');

    return { text, wordCount: countWords(text), pages: 1 };
  } catch {
    return { text: '', wordCount: 0, pages: 0 };
  }
}
