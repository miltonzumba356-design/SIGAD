import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { getDatabase } from '../config/database';
import { DocumentoModel } from '../models/DocumentoModel';
import { FicheiroModel } from '../models/FicheiroModel';
import { AuthRequest, verificarAutenticacao, temPermissao, isolamentoInstituicao } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { getIndexedDocuments, indexDocument } from '../search/documentIndexer';
import { searchDocuments, generateNameSnippet } from '../search/searchEngine';
import { tokenize } from '../search/textNormalizer';
import { SearchResult } from '../search/searchTypes';

const router = Router();

/**
 * Finds documents whose title or stored file name matches the query terms,
 * for documents that have not (yet) been content-indexed.
 */
function searchByTituloOuArquivo(instituicaoId: number | undefined, query: string, excludeIds: Set<string>): SearchResult[] {
  const terms = tokenize(query);
  const phrase = query.toLowerCase().trim();
  if (terms.length === 0) return [];

  const db = getDatabase();
  const rows = db.prepare(`
    SELECT d.id as id, d.titulo as titulo, f.nome_original as nome_arquivo
    FROM documentos d
    LEFT JOIN ficheiros f ON f.documento_id = d.id
    WHERE d.instituicao_id = ? AND d.deleted_at IS NULL
  `).all(instituicaoId) as Array<{ id: number; titulo: string; nome_arquivo: string | null }>;

  const byDoc = new Map<number, { titulo: string; nomes: Set<string> }>();
  for (const row of rows) {
    if (!byDoc.has(row.id)) byDoc.set(row.id, { titulo: row.titulo, nomes: new Set() });
    if (row.nome_arquivo) byDoc.get(row.id)!.nomes.add(row.nome_arquivo);
  }

  const results: SearchResult[] = [];
  for (const [id, info] of byDoc) {
    const docId = String(id);
    if (excludeIds.has(docId)) continue;

    let best: { text: string; matchCount: number } | null = null;
    for (const candidate of [info.titulo, ...info.nomes].filter(Boolean)) {
      const normalized = candidate.toLowerCase();
      const matchCount = terms.reduce((sum, term) => normalized.includes(term) ? sum + 1 : sum, 0);
      if (matchCount === 0) continue;
      if (!best || matchCount > best.matchCount) best = { text: candidate, matchCount };
    }
    if (!best) continue;

    const phraseBonus = phrase && best.text.toLowerCase().includes(phrase) ? 1 : 0;
    results.push({
      docId,
      docName: info.titulo,
      docType: 'digital',
      score: Math.min(100, (best.matchCount + phraseBonus) * 20),
      snippet: generateNameSnippet(best.text, terms),
      matchCount: best.matchCount,
      pages: 1
    });
  }

  return results;
}

/**
 * POST /search
 * Searches indexed documents, plus document titles and file names.
 */
router.post('/search', verificarAutenticacao, temPermissao('docs.view'), (req: AuthRequest, res) => {
  const query = String(req.body?.query || '').trim();
  const filter = req.body?.filter || 'all';

  if (!query) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Query obrigatória.' } });
  }

  if (!['all', 'digital', 'ocr', 'hybrid'].includes(filter)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Filtro inválido.' } });
  }

  const indexedResults = searchDocuments(getIndexedDocuments(req.usuario!.instituicao_id), query, { filter });

  let results = indexedResults;
  if (filter === 'all' || filter === 'digital') {
    const excludeIds = new Set(indexedResults.map(item => item.docId));
    const metadataResults = searchByTituloOuArquivo(req.usuario!.instituicao_id, query, excludeIds);
    results = [...indexedResults, ...metadataResults].sort((a, b) => b.score - a.score);
  }

  res.json(results);
});

/**
 * POST /documents/:id/index
 * Indexes an uploaded file for a document.
 */
router.post(
  '/documents/:id/index',
  verificarAutenticacao,
  isolamentoInstituicao,
  temPermissao('docs.upload'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = DocumentoModel.buscarPorId(documentId);

      if (!document || document.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento não encontrado.' } });
      }

      let filePath = req.file?.path;
      let originalName = req.file?.originalname;

      if (!filePath) {
        const files = FicheiroModel.buscarPorDocumento(documentId) as Array<{ nome_interno: string; nome_original: string }>;
        const latestFile = files[0];
        if (!latestFile) {
          return res.status(400).json({ error: { code: 'NO_FILE', message: 'Nenhum ficheiro encontrado para indexar.' } });
        }

        filePath = path.join(process.env.UPLOAD_PATH || './uploads', latestFile.nome_interno);
        originalName = latestFile.nome_original;
      }

      const file = await fs.promises.readFile(filePath);
      const indexed = await indexDocument(file, {
        id: documentId,
        name: document.titulo || originalName || `Documento ${documentId}`,
        ext: path.extname(originalName || filePath),
        instituicao_id: document.instituicao_id
      });

      res.json({
        success: true,
        docType: indexed.type,
        wordCount: indexed.wordCount
      });
    } catch {
      res.status(500).json({ error: { code: 'INDEX_ERROR', message: 'Erro ao indexar documento.' } });
    }
  }
);

export default router;
