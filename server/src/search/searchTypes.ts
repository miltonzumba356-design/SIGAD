export type DocumentType = 'digital' | 'ocr' | 'hybrid';

export interface IndexedDocument {
  id: string;
  name: string;
  type: DocumentType;
  text: string;
  paragraphs: string[];
  wordMap: Record<string, number>;
  wordCount: number;
  pages: number;
  indexedAt: string;
}

export interface SearchResult {
  docId: string;
  docName: string;
  docType: DocumentType;
  score: number;
  snippet: string;
  matchCount: number;
  pages: number;
}

export interface ExtractionResult {
  text: string;
  wordCount: number;
  pages?: number;
  type?: DocumentType;
}

export interface DocumentMeta {
  id: string | number;
  name: string;
  ext: string;
  instituicao_id?: number;
}
