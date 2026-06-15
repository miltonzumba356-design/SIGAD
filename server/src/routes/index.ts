import { Router } from 'express';
import { headersSeguranca, saneamentoInput } from '../middleware/security';
import authRoutes from './auth';
import usuariosRoutes from './usuarios';
import instituicoesRoutes from './instituicoes';
import pastasRoutes from './pastas';
import documentosRoutes from './documentos';
import emprestimosRoutes from './emprestimos';
import digitalizacaoRoutes from './digitalizacao';
import arquivoFisicoRoutes from './arquivoFisico';
import { AuditoriaController } from '../controllers/AuditoriaController';
import { RelatorioController } from '../controllers/RelatorioController';
import { TrashController } from '../controllers/TrashController';
import { temPermissao, temQualquerPermissao, verificarAutenticacao, isolamentoInstituicao } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import searchRoutes from '../api/search.route';

const router = Router();

// Middleware Global de Segurança (Regra 1.9 e 18)
router.use(headersSeguranca);
router.use(saneamentoInput);

/**
 * Versão 1.0.0 da API
 */
const v1 = Router();
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Muitas tentativas de autenticacao. Aguarde e tente novamente.'
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300
});

import { RoleModel } from '../models/RoleModel';

// ... (existing imports)

v1.use(apiLimiter);
v1.use('/auth', authLimiter, authRoutes);
v1.use('/users', usuariosRoutes);
v1.use('/institutions', instituicoesRoutes);
v1.use('/folders', pastasRoutes);
v1.use('/documents', documentosRoutes);
v1.use('/loans', emprestimosRoutes);
v1.use('/digitization', digitalizacaoRoutes);
v1.use('/physical-archive', arquivoFisicoRoutes);
v1.use('/', searchRoutes);

// Roles (Perfis)
v1.get('/roles', verificarAutenticacao, (req, res) => {
  try {
    const roles = RoleModel.listarTodas();
    res.json({ data: roles });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar perfis.' } });
  }
});

// Auditoria (Regra 14)
v1.get('/audit', verificarAutenticacao, isolamentoInstituicao, temQualquerPermissao(['rep.audit', 'audit.view']), AuditoriaController.listar);

// Relatórios (Regra 12)
v1.get('/reports', verificarAutenticacao, isolamentoInstituicao, temPermissao('rep.view'), RelatorioController.listar);
v1.post('/reports', verificarAutenticacao, isolamentoInstituicao, temPermissao('rep.generate'), RelatorioController.gerar);

// Reciclagem (Regra 16)
v1.get('/trash', verificarAutenticacao, isolamentoInstituicao, temPermissao('sys.trash'), TrashController.listar);
v1.post('/trash/:tipo/:id/restore', verificarAutenticacao, isolamentoInstituicao, temPermissao('sys.trash'), TrashController.restaurar);

// Montar v1 sob /v1
router.use('/v1', v1);

export default router;
