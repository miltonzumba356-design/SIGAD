import { Router } from 'express';
import { PastaController } from '../controllers/PastaController';
import { verificarAutenticacao, temPermissao, isolamentoInstituicao } from '../middleware/auth';
import { auditoriaMiddleware } from '../middleware/auditoria';

const router = Router();

// Todas as rotas requerem autenticação e isolamento por instituição
router.use(verificarAutenticacao);
router.use(isolamentoInstituicao);

/**
 * GET /folders
 * Lista pastas da instituição
 * Permissão: docs.view
 */
router.get('/', temPermissao('docs.view'), PastaController.listar);

/**
 * POST /folders
 * Cria nova pasta
 * Permissão: docs.edit
 */
router.post('/', temPermissao('docs.edit'), auditoriaMiddleware('CRIAR_PASTA', 'pasta'), PastaController.criar);

/**
 * GET /folders/{id}
 */
router.get('/:id', temPermissao('docs.view'), PastaController.buscarPorId);

/**
 * GET /folders/{id}/subfolders
 */
router.get('/:id/subfolders', temPermissao('docs.view'), PastaController.listarSubpastas);

/**
 * PUT /folders/{id}
 * Permissão: docs.edit
 */
router.put('/:id', temPermissao('docs.edit'), auditoriaMiddleware('EDITAR_PASTA', 'pasta'), PastaController.atualizar);

/**
 * DELETE /folders/{id}
 * Permissão: docs.delete
 */
router.delete('/:id', temPermissao('docs.delete'), auditoriaMiddleware('APAGAR_PASTA', 'pasta'), PastaController.excluir);

export default router;
