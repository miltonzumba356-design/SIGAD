import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { DocumentoModel } from '../models/DocumentoModel';
import { FicheiroModel } from '../models/FicheiroModel';
import { AuthRequest, verificarAutenticacao, temPermissao, isolamentoInstituicao } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { getIndexedDocuments, indexDocument } from '../search/documentIndexer';
import { searchDocuments } from '../search/searchEngine';

const router = Router();

/**
 * POST /search
 * Searches indexed documents.
 */
router.post('/search', verificarAutenticacao, temPermissao('docs.view'), (req: AuthRequest, res) => {
  const query = String(req.body?.query || '').trim();
  const filter = req.body?.filter || 'all';

  if (!query) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Query obrigatoria.' } });
  }

  if (!['all', 'digital', 'ocr', 'hybrid'].includes(filter)) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Filtro invalido.' } });
  }

  const results = searchDocuments(getIndexedDocuments(req.usuario!.instituicao_id), query, { filter });
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
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento nao encontrado.' } });
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
