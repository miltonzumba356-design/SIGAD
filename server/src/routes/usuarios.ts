import { Router } from 'express';
import { UsuarioController } from '../controllers/UsuarioController';
import { verificarAutenticacao, temPermissao, isolamentoInstituicao } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(verificarAutenticacao);

/**
 * GET /users/me
 * Dados do próprio utilizador
 */
router.get('/me', UsuarioController.me);

/**
 * GET /users
 * Lista utilizadores da instituição
 * Permissão: users.view
 */
router.get('/', temPermissao('users.view'), UsuarioController.listar);

/**
 * POST /users
 * Cria novo utilizador
 * Permissão: users.create
 */
router.post('/', temPermissao('users.create'), UsuarioController.criar);

/**
 * GET /users/{id}
 * Detalhe de um utilizador
 * Permissão: users.view
 */
router.get('/:id', temPermissao('users.view'), UsuarioController.buscar);

/**
 * PUT /users/{id}
 * Atualiza utilizador
 * Permissão: users.edit
 */
router.put('/:id', temPermissao('users.edit'), UsuarioController.atualizar);

/**
 * PATCH /users/{id}/deactivate
 * Desactiva utilizador (Soft Delete)
 * Permissão: users.deactivate
 */
router.patch('/:id', temPermissao('users.deactivate'), UsuarioController.desactivar);

export default router;
