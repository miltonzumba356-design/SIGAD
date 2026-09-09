import { Router } from 'express';
import { AutorizacaoDownloadController } from '../controllers/AutorizacaoDownloadController';
import { verificarAutenticacao, isolamentoInstituicao } from '../middleware/auth';
import { auditoriaMiddleware } from '../middleware/auditoria';

const router = Router();

router.use(verificarAutenticacao);
router.use(isolamentoInstituicao);

/**
 * GET /download-requests?estado=PENDENTE
 * Apenas administradores (verificado dentro do controller).
 */
router.get('/', AutorizacaoDownloadController.listar);

/**
 * PATCH /download-requests/{id}/respond
 * Apenas administradores (verificado dentro do controller).
 */
router.patch('/:id/respond', auditoriaMiddleware('RESPONDER_PEDIDO_DOWNLOAD', 'autorizacao_download'), AutorizacaoDownloadController.responder);

export default router;
