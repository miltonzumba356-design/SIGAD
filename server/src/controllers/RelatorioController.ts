import { Response } from 'express';
import fs from 'fs';
import { RelatorioModel } from '../models/RelatorioModel';
import { InstituicaoModel } from '../models/InstituicaoModel';
import { AuthRequest } from '../middleware/auth';
import { generateReportFile } from '../services/reportService';

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
      const instituicaoId = req.usuario!.instituicao_id;
      const id = RelatorioModel.criar({
        instituicao_id: instituicaoId,
        usuario_id: req.usuario!.id,
        nome: name,
        tipo: type,
        filtros: filters
      });

      const instituicao = InstituicaoModel.buscarPorId(instituicaoId);

      generateReportFile(type, instituicaoId, instituicao?.nome || 'Instituição')
        .then(filePath => {
          RelatorioModel.atualizarStatus(id, 'CONCLUIDO', filePath);
        })
        .catch(error => {
          console.error('[Relatorios] Falha ao gerar relatório:', error instanceof Error ? error.message : error);
          RelatorioModel.atualizarStatus(id, 'ERRO');
        });

      res.status(202).json({ data: { id, status: 'PENDENTE', message: 'Geração de relatório iniciada.' } });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao iniciar relatório.' } });
    }
  }

  /**
   * GET /reports/{id}/file
   * Descarrega/visualiza o PDF de um relatório concluído.
   */
  static ficheiro(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const relatorio = RelatorioModel.buscarPorId(id);

      if (!relatorio || relatorio.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Relatório não encontrado.' } });
      }

      if (relatorio.estado !== 'CONCLUIDO' || !relatorio.caminho_ficheiro) {
        return res.status(409).json({ error: { code: 'NOT_READY', message: 'Relatório ainda não está concluído.' } });
      }

      if (!fs.existsSync(relatorio.caminho_ficheiro)) {
        return res.status(404).json({ error: { code: 'NO_FILE', message: 'Ficheiro do relatório não encontrado no armazenamento.' } });
      }

      res.setHeader('Content-Type', 'application/pdf');
      const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
      res.setHeader('Content-Disposition', `${disposition}; filename="relatorio_${relatorio.tipo}_${id}.pdf"`);
      res.sendFile(relatorio.caminho_ficheiro);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao obter ficheiro do relatório.' } });
    }
  }
}
