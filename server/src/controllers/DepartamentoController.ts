import { Response } from 'express';
import { DepartamentoModel } from '../models/DepartamentoModel';
import { AuthRequest } from '../middleware/auth';

export class DepartamentoController {
  /**
   * GET /departments
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const departamentos = DepartamentoModel.listarPorInstituicao(instituicaoId);
      res.json({ data: departamentos });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar departamentos.' } });
    }
  }

  /**
   * POST /departments
   */
  static criar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const id = DepartamentoModel.criar({ ...req.body, instituicao_id: instituicaoId });
      res.status(201).json({ data: { id, message: 'Departamento criado com sucesso.' } });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar departamento.' } });
    }
  }

  /**
   * GET /departments/{id}
   */
  static buscar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const departamento = DepartamentoModel.buscarPorId(id);

      if (!departamento || departamento.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Departamento não encontrado.' } });
      }

      res.json({ data: departamento });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar departamento.' } });
    }
  }

  /**
   * PUT /departments/{id}
   */
  static atualizar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const departamento = DepartamentoModel.buscarPorId(id);

      if (!departamento || departamento.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Departamento não encontrado.' } });
      }

      const sucesso = DepartamentoModel.atualizar(id, req.body);
      if (sucesso) {
        res.json({ data: { message: 'Departamento atualizado com sucesso.' } });
      } else {
        res.status(400).json({ error: { code: 'UPDATE_FAILED', message: 'Nenhuma alteração realizada.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar departamento.' } });
    }
  }

  /**
   * DELETE /departments/{id}
   */
  static excluir(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const departamento = DepartamentoModel.buscarPorId(id);

      if (!departamento || departamento.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Departamento não encontrado.' } });
      }

      const sucesso = DepartamentoModel.softDelete(id, req.usuario!.id);
      if (sucesso) {
        res.json({ data: { message: 'Departamento excluído com sucesso.' } });
      } else {
        res.status(400).json({ error: { code: 'DELETE_FAILED', message: 'Não foi possível excluir o departamento.' } });
      }
    } catch (error: any) {
      if (error.message === 'DEPT_HAS_USERS') {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Departamento com utilizadores ativos não pode ser eliminado.' } });
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir departamento.' } });
    }
  }
}
