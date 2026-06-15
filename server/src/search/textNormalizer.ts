export type NormalizedText = {
  cleanText: string;
  paragraphs: string[];
};

/**
 * Tokenizes text into normalized word terms.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+/g) || [];
}

/**
 * Counts normalized words in a text block.
 */
export function countWords(text: string): number {
  return tokenize(text).length;
}

/**
 * Normalizes raw extracted text and returns clean text plus useful paragraphs.
 */
export function normalizeText(rawText: string): NormalizedText {
  const withoutNoise = rawText
    .toLowerCase()
    .replace(/[|\\]+/g, ' ')
    .replace(/\bl\s+/g, ' ')
    .replace(/\s+l\b/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const paragraphs = withoutNoise
    .split(/\n\s*\n/g)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(paragraph => paragraph.length >= 20);

  return {
    cleanText: withoutNoise.replace(/\s+/g, ' ').trim(),
    paragraphs
  };
}
