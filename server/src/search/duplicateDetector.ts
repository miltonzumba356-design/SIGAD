import { getDatabase } from '../config/database';
import { getIndexedDocuments } from './documentIndexer';
import type { IndexedDocument } from './searchTypes';

export interface DuplicateCandidate {
  docId: string;
  docName: string;
  similarity: number;
  wordCount: number;
  data?: Record<string, unknown>;
}

/**
 * Calculates cosine similarity between two indexed word maps.
 */
export function calculateWordMapSimilarity(
  left: Record<string, number>,
  right: Record<string, number>
): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const [word, count] of Object.entries(left)) {
    leftNorm += count * count;
    dot += count * (right[word] || 0);
  }

  for (const count of Object.values(right)) {
    rightNorm += count * count;
  }

  if (!leftNorm || !rightNorm) return 0;
  return (dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))) * 100;
}

/**
 * Finds the closest indexed document in the same institution.
 */
export function findDuplicateDocument(
  document: IndexedDocument,
  instituicaoId: number,
  threshold = 98,
  excludeDocId?: string
): DuplicateCandidate | null {
  const indexed = getIndexedDocuments(instituicaoId)
    .filter(item => item.id !== excludeDocId && item.wordCount > 0);

  const best = indexed.reduce<DuplicateCandidate | null>((candidate, item) => {
    const similarity = calculateWordMapSimilarity(document.wordMap, item.wordMap);
    if (!candidate || similarity > candidate.similarity) {
      return {
        docId: item.id,
        docName: item.name,
        similarity,
        wordCount: item.wordCount
      };
    }
    return candidate;
  }, null);

  if (!best || best.similarity < threshold) return null;
  return { ...best, data: getDocumentData(Number(best.docId)) };
}

function getDocumentData(documentId: number): Record<string, unknown> | undefined {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT d.*, p.nome as pasta_nome, lf.nome as localizacao_nome,
           dl.localizacao_id, dl.numero_caixa, dl.condicao
    FROM documentos d
    LEFT JOIN pastas p ON p.id = d.pasta_id
    LEFT JOIN documentos_localizacao dl ON dl.documento_id = d.id
    LEFT JOIN localizacoes_fisicas lf ON lf.id = dl.localizacao_id
    WHERE d.id = ? AND d.deleted_at IS NULL
  `).get(documentId) as Record<string, unknown> | undefined;
  return row;
}
