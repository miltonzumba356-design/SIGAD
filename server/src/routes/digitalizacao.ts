import { Router } from 'express';
import { FilaDigitalizacaoController } from '../controllers/FilaDigitalizacaoController';
import { verificarAutenticacao, temPermissao, temQualquerPermissao, isolamentoInstituicao } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { auditoriaMiddleware } from '../middleware/auditoria';

const router = Router();

router.use(verificarAutenticacao);
router.use(isolamentoInstituicao);

/**
 * GET /digitization
 * Lista itens na fila de digitalização
 * Permissão: dig.view
 */
router.get('/', temPermissao('dig.view'), FilaDigitalizacaoController.listar);

/**
 * GET /digitization/scanners
 * Lista scanners WIA/WSD instalados no Windows.
 * Permissao: dig.do
 */
router.get('/scanners', temPermissao('dig.do'), FilaDigitalizacaoController.scanners);

/**
 * POST /digitization
 * Adicionar documento à fila
 * Permissão: dig.view (ou superior)
 */
router.post('/', temQualquerPermissao(['dig.view', 'dig.physical']), auditoriaMiddleware('CRIAR_FILA_DIGITALIZACAO', 'fila_digitalizacao'), FilaDigitalizacaoController.adicionar);

/**
 * POST /digitization/scan
 * Cria documento a partir de scanner de rede eSCL/AirScan.
 * Permissao: dig.do
 */
router.post('/scan', temPermissao('dig.do'), auditoriaMiddleware('DIGITALIZAR_SCANNER', 'documento'), FilaDigitalizacaoController.digitalizarScanner);

/**
 * POST /digitization/scan/:pendingId/resolve
 * Resolve duplicidade detectada na digitalizacao.
 * Permissao: dig.do
 */
router.post('/scan/:pendingId/resolve', temPermissao('dig.do'), auditoriaMiddleware('RESOLVER_DUPLICIDADE_DIGITALIZACAO', 'digitalizacao_pendente'), FilaDigitalizacaoController.resolverDuplicidade);

/**
 * PATCH /digitization/:id/assume
 * Assumir tarefa de digitalização
 * Permissão: dig.do
 */
router.patch('/:id/assume', temPermissao('dig.do'), auditoriaMiddleware('ASSUMIR_DIGITALIZACAO', 'fila_digitalizacao'), FilaDigitalizacaoController.assumir);

/**
 * PATCH /digitization/:id/complete
 * Concluir digitalização e anexar ficheiro
 * Permissão: dig.do
 */
router.patch('/:id/complete', temPermissao('dig.do'), upload.single('file'), auditoriaMiddleware('CONCLUIR_DIGITALIZACAO', 'fila_digitalizacao'), FilaDigitalizacaoController.concluir);

export default router;
