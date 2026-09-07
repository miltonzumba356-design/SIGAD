import { Router } from 'express';
import { EmprestimoController } from '../controllers/EmprestimoController';
import { verificarAutenticacao, temPermissao, isolamentoInstituicao } from '../middleware/auth';
import { auditoriaMiddleware } from '../middleware/auditoria';

const router = Router();

router.use(verificarAutenticacao);
router.use(isolamentoInstituicao);

/**
 * GET /loans
 * Lista empréstimos da instituição
 * Permissão: loans.view
 */
router.get('/', temPermissao('loans.view'), EmprestimoController.listar);

/**
 * POST /loans
 * Solicitar empréstimo
 * Permissão: loans.request
 */
router.post('/', temPermissao('loans.request'), auditoriaMiddleware('SOLICITAR_EMPRESTIMO', 'emprestimo'), EmprestimoController.solicitar);

/**
 * PATCH /loans/:id/respond
 * Aprovar ou rejeitar solicitação
 * Permissão: loans.approve
 */
router.patch('/:id/respond', temPermissao('loans.approve'), auditoriaMiddleware('RESPONDER_EMPRESTIMO', 'emprestimo'), EmprestimoController.responder);

/**
 * PATCH /loans/:id/return
 * Registrar devolução
 * Permissão: loans.return
 */
router.patch('/:id/return', temPermissao('loans.return'), auditoriaMiddleware('DEVOLVER_EMPRESTIMO', 'emprestimo'), EmprestimoController.devolver);

export default router;

