import { getDatabase } from '../config/database';
import { detectFileType } from './fileTypeDetector';
import { extractPdf } from './extractors/pdfExtractor';
import { extractOcr } from './extractors/ocrExtractor';
import { extractText } from './extractors/textExtractor';
import { countWords, normalizeText, tokenize } from './textNormalizer';
import { DocumentMeta, DocumentType, IndexedDocument } from './searchTypes';

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'webp']);

function ensureSearchTable(): void {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_index (
      doc_id TEXT PRIMARY KEY,
      instituicao_id INTEGER,
      doc_name TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      text TEXT NOT NULL,
      paragraphs_json TEXT NOT NULL,
      word_map_json TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      pages INTEGER NOT NULL,
      indexed_at TEXT NOT NULL
    );
  `);
  const columns = db.prepare('PRAGMA table_info(search_index)').all() as Array<{ name: string }>;
  if (!columns.some(column => column.name === 'instituicao_id')) {
    db.exec('ALTER TABLE search_index ADD COLUMN instituicao_id INTEGER');
  }
}

function buildWordMap(text: string): Record<string, number> {
  return tokenize(text).reduce<Record<string, number>>((map, word) => {
    map[word] = (map[word] || 0) + 1;
    return map;
  }, {});
}

/**
 * Stores an indexed document in SQLite.
 */
export function saveIndexedDocument(document: IndexedDocument): void {
  ensureSearchTable();
  const db = getDatabase();
  db.prepare(`
    INSERT INTO search_index (
      doc_id, doc_name, doc_type, text, paragraphs_json,
      word_map_json, word_count, pages, indexed_at, instituicao_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(doc_id) DO UPDATE SET
      doc_name = excluded.doc_name,
      doc_type = excluded.doc_type,
      text = excluded.text,
      paragraphs_json = excluded.paragraphs_json,
      word_map_json = excluded.word_map_json,
      word_count = excluded.word_count,
      pages = excluded.pages,
      indexed_at = excluded.indexed_at
      , instituicao_id = excluded.instituicao_id
  `).run(
    document.id,
    document.name,
    document.type,
    document.text,
    JSON.stringify(document.paragraphs),
    JSON.stringify(document.wordMap),
    document.wordCount,
    document.pages,
    document.indexedAt,
    (document as IndexedDocument & { instituicao_id?: number }).instituicao_id || null
  );
}

/**
 * Loads all indexed documents from SQLite.
 */
export function getIndexedDocuments(instituicaoId?: number): IndexedDocument[] {
  ensureSearchTable();
  const db = getDatabase();
  const rows = (instituicaoId
    ? db.prepare('SELECT * FROM search_index WHERE instituicao_id = ? ORDER BY indexed_at DESC').all(instituicaoId)
    : db.prepare('SELECT * FROM search_index ORDER BY indexed_at DESC').all()) as Array<{
    doc_id: string;
    doc_name: string;
    doc_type: DocumentType;
    text: string;
    paragraphs_json: string;
    word_map_json: string;
    word_count: number;
    pages: number;
    indexed_at: string;
  }>;

  return rows.map(row => ({
    id: row.doc_id,
    name: row.doc_name,
    type: row.doc_type,
    text: row.text,
    paragraphs: JSON.parse(row.paragraphs_json),
    wordMap: JSON.parse(row.word_map_json),
    wordCount: row.word_count,
    pages: row.pages,
    indexedAt: row.indexed_at
  }));
}

/**
 * Extracts and normalizes a file into an IndexedDocument without persisting it.
 */
export async function buildIndexedDocument(file: Buffer, meta: DocumentMeta): Promise<IndexedDocument> {
  const ext = meta.ext.toLowerCase().replace(/^\./, '');
  const detectedType = await detectFileType(file, ext);

  const extraction = ext === 'pdf'
    ? await extractPdf(file)
    : imageExtensions.has(ext)
      ? await extractOcr(file)
      : await extractText(file, ext);

  const normalized = normalizeText(extraction.text);
  const wordMap = buildWordMap(normalized.cleanText);
  const wordCount = countWords(normalized.cleanText);
  const indexedDocument: IndexedDocument = {
    id: String(meta.id),
    name: meta.name,
    type: extraction.type || detectedType,
    text: normalized.cleanText,
    paragraphs: normalized.paragraphs,
    wordMap,
    wordCount,
    pages: extraction.pages || 1,
    indexedAt: new Date().toISOString()
  };
  return indexedDocument;
}

/**
 * Extracts, normalizes, indexes, and persists one document.
 */
export async function indexDocument(file: Buffer, meta: DocumentMeta): Promise<IndexedDocument> {
  ensureSearchTable();
  const indexedDocument = await buildIndexedDocument(file, meta);
  saveIndexedDocument({ ...indexedDocument, instituicao_id: meta.instituicao_id } as IndexedDocument & { instituicao_id?: number });
  return indexedDocument;
}
