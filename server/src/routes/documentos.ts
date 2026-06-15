import { Router } from 'express';
import { DocumentoController } from '../controllers/DocumentoController';
import { verificarAutenticacao, temPermissao, isolamentoInstituicao } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { auditoriaMiddleware } from '../middleware/auditoria';

const router = Router();

// Todas as rotas requerem autenticação e isolamento por instituição
router.use(verificarAutenticacao);
router.use(isolamentoInstituicao);

/**
 * GET /documents/stats
 */
router.get('/stats', temPermissao('docs.view'), DocumentoController.stats);

/**
 * GET /documents
 * Lista documentos da instituição
 * Permissão: docs.view
 */
router.get('/', temPermissao('docs.view'), DocumentoController.listar);

/**
 * POST /documents
 * Registra novo documento (metadados + ficheiro opcional)
 * Permissão: docs.upload
 */
router.post('/', temPermissao('docs.upload'), upload.single('file'), auditoriaMiddleware('CRIAR_DOCUMENTO', 'documento'), DocumentoController.criar);

/**
 * GET /documents/{id}/file
 * Abre ficheiro inline sem expor rota de download.
 */
router.get('/:id/file', temPermissao('docs.view'), auditoriaMiddleware('VISUALIZAR_FICHEIRO', 'documento'), DocumentoController.ficheiro);

/**
 * GET /documents/{id}/text
 * Extrai texto para leitura protegida.
 */
router.get('/:id/text', temPermissao('docs.view'), DocumentoController.texto);

/**
 * GET /documents/{id}
 * Detalhe completo de um documento
 * Permissão: docs.view
 */
router.get('/:id', temPermissao('docs.view'), DocumentoController.buscar);

/**
 * PUT /documents/{id}
 * Atualiza metadados de um documento
 * Permissão: docs.edit
 */
router.put('/:id', temPermissao('docs.edit'), upload.single('file'), auditoriaMiddleware('EDITAR_DOCUMENTO', 'documento'), DocumentoController.atualizar);

/**
 * DELETE /documents/{id}
 * Elimina um documento (Soft Delete)
 * Permissão: docs.delete
 */
router.delete('/:id', temPermissao('docs.delete'), auditoriaMiddleware('APAGAR_DOCUMENTO', 'documento'), DocumentoController.excluir);

export default router;
