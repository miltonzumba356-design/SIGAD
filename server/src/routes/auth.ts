import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { verificarAutenticacao } from '../middleware/auth';
import { auditoriaMiddleware } from '../middleware/auditoria';

const router = Router();

/**
 * POST /auth/login
 * Autentica o utilizador e devolve token de acesso e token de renovação.
 * Permissão: Pública
 */
router.post('/login', AuthController.login);

/**
 * POST /auth/refresh
 * Renova o token de acesso usando o token de renovação.
 * Permissão: Requer refresh token válido
 */
router.post('/refresh', AuthController.refresh);

/**
 * POST /auth/logout
 * Encerra a sessão do utilizador.
 * Permissão: Autenticado
 */
router.post('/logout', verificarAutenticacao, auditoriaMiddleware('LOGOUT', 'sessao'), AuthController.logout);

router.post('/switch-institution', verificarAutenticacao, auditoriaMiddleware('TROCAR_INSTITUICAO', 'sessao'), AuthController.switchInstitution);

export default router;
