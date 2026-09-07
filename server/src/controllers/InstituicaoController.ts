import { Response } from 'express';
import { InstituicaoModel } from '../models/InstituicaoModel';
import { AuthRequest } from '../middleware/auth';

export class InstituicaoController {
  /**
   * GET /institutions
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicoes = InstituicaoModel.listarTodas();
      res.json({ data: instituicoes });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar instituições.' } });
    }
  }

  /**
   * POST /institutions
   */
  static criar(req: AuthRequest, res: Response) {
    try {
      const { codigo, nome, storage_limit_gb } = req.body;

      if (!codigo || !nome) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Código e nome são obrigatórios.' } });
      }

      if (storage_limit_gb !== undefined && Number(storage_limit_gb) <= 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Limite de armazenamento deve ser maior que zero.' } });
      }

      const id = InstituicaoModel.criar(req.body);
      res.status(201).json({ data: { id, message: 'Instituição criada com sucesso.' } });
    } catch (error: any) {
      if (error.message === 'INSTITUTION_CODE_EXISTS') {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Já existe uma instituição com este código.' } });
      }

      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar instituição.' } });
    }
  }

  /**
   * GET /institutions/{id}
   */
  static buscar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const instituicao = InstituicaoModel.buscarPorId(id);

      if (!instituicao) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Instituição não encontrada.' } });
      }

      res.json({ data: instituicao });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar instituição.' } });
    }
  }

  /**
   * PUT /institutions/{id}
   */
  static atualizar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const sucesso = InstituicaoModel.atualizar(id, req.body);

      if (sucesso) {
        res.json({ data: { message: 'Instituição atualizada com sucesso.' } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Instituição não encontrada.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar instituição.' } });
    }
  }

  /**
   * DELETE /institutions/{id}
   */
  static excluir(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const sucesso = InstituicaoModel.softDelete(id, req.usuario!.id);

      if (sucesso) {
        res.json({ data: { message: 'Instituição removida com sucesso.' } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Instituição não encontrada.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover instituição.' } });
    }
  }

  /**
   * GET /institutions/{id}/stats
   */
  static stats(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const stats = InstituicaoModel.getStats(id);
      res.json({ data: stats });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao obter estatísticas.' } });
    }
  }
}
