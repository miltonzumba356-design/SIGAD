import { Response } from 'express';
import { EmprestimoModel } from '../models/EmprestimoModel';
import { AuthRequest } from '../middleware/auth';

export class EmprestimoController {
  /**
   * POST /loans
   * Solicitar empréstimo de documento
   */
  static solicitar(req: AuthRequest, res: Response) {
    try {
      const { document_id, return_date, reason } = req.body;
      const id = EmprestimoModel.solicitar({
        instituicao_id: req.usuario!.instituicao_id,
        documento_id: document_id,
        requisitante_id: req.usuario!.id,
        data_prevista_devolucao: return_date,
        motivo: reason
      });

      res.status(201).json({ data: { id, message: 'Solicitação de empréstimo enviada com sucesso.' } });
    } catch (error: any) {
      if (error.message === 'DOCUMENT_ALREADY_LOANED') {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Documento já se encontra emprestado.' } });
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao solicitar empréstimo.' } });
    }
  }

  /**
   * PATCH /loans/{id}/respond
   * Aprovar ou Rejeitar solicitação
   * Permissão: loans.approve
   */
  static responder(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const { approved, notes } = req.body;
      
      const sucesso = EmprestimoModel.responder(id, req.usuario!.id, approved, notes);
      
      if (sucesso) {
        res.json({ data: { message: `Empréstimo ${approved ? 'aprovado' : 'rejeitado'} com sucesso.` } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Solicitação não encontrada ou já processada.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao processar resposta.' } });
    }
  }

  /**
   * PATCH /loans/{id}/return
   * Registrar devolução
   * Permissão: loans.return
   */
  static devolver(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const { notes } = req.body;
      
      const sucesso = EmprestimoModel.registrarDevolucao(id, notes);
      
      if (sucesso) {
        res.json({ data: { message: 'Devolução registrada com sucesso.' } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Empréstimo ativo não encontrado.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao registrar devolução.' } });
    }
  }

  /**
   * GET /loans
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const { status } = req.query;
      const emprestimos = EmprestimoModel.listarPorInstituicao(instituicaoId, { estado: status });
      res.json({ data: emprestimos });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar empréstimos.' } });
    }
  }
}
