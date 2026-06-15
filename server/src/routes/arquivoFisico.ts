import { Router } from 'express';
import { LocalizacaoFisicaController } from '../controllers/LocalizacaoFisicaController';
import { verificarAutenticacao, temPermissao, isolamentoInstituicao } from '../middleware/auth';
import { auditoriaMiddleware } from '../middleware/auditoria';

const router = Router();

router.use(verificarAutenticacao);
router.use(isolamentoInstituicao);

/**
 * GET /physical-archive
 * Lista localizações (suporta filtro por parent_id)
 */
router.get('/', temPermissao('docs.view'), LocalizacaoFisicaController.listar);

/**
 * GET /physical-archive/tree
 * Retorna a árvore completa do arquivo
 */
router.get('/tree', temPermissao('docs.view'), LocalizacaoFisicaController.arvore);

/**
 * POST /physical-archive
 * Cria nova localização
 * Permissão: docs.edit
 */
router.post('/', temPermissao('docs.edit'), auditoriaMiddleware('CRIAR_LOCALIZACAO_FISICA', 'localizacao_fisica'), LocalizacaoFisicaController.criar);

/**
 * GET /physical-archive/{id}
 */
router.get('/:id', temPermissao('docs.view'), LocalizacaoFisicaController.buscar);

/**
 * PUT /physical-archive/{id}
 * Permissão: docs.edit
 */
router.put('/:id', temPermissao('docs.edit'), auditoriaMiddleware('EDITAR_LOCALIZACAO_FISICA', 'localizacao_fisica'), LocalizacaoFisicaController.atualizar);

/**
 * DELETE /physical-archive/{id}
 * Permissão: docs.delete
 */
router.delete('/:id', temPermissao('docs.delete'), auditoriaMiddleware('APAGAR_LOCALIZACAO_FISICA', 'localizacao_fisica'), LocalizacaoFisicaController.excluir);

export default router;
