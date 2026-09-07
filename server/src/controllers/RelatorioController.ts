import { Response } from 'express';
import { RelatorioModel } from '../models/RelatorioModel';
import { AuthRequest } from '../middleware/auth';

export class RelatorioController {
  /**
   * GET /reports
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const relatorios = RelatorioModel.listarPorInstituicao(instituicaoId);
      res.json({ data: relatorios });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar relatórios.' } });
    }
  }

  /**
   * POST /reports
   * Regra 12: Geração assíncrona de relatórios.
   */
  static gerar(req: AuthRequest, res: Response) {
    try {
      const { name, type, filters } = req.body;
      const id = RelatorioModel.criar({
        instituicao_id: req.usuario!.instituicao_id,
        usuario_id: req.usuario!.id,
        nome: name,
        tipo: type,
        filtros: filters
      });

      // Simulação de processamento assíncrono
      setTimeout(() => {
        RelatorioModel.atualizarStatus(id, 'CONCLUIDO', `/exports/relatorio_${id}.pdf`);
      }, 5000);

      res.status(202).json({ data: { id, status: 'PENDENTE', message: 'Geração de relatório iniciada.' } });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao iniciar relatório.' } });
    }
  }
}
