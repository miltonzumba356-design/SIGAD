import { Request, Response } from 'express';
import { PastaModel } from '../models/PastaModel';
import { AuthRequest } from '../middleware/auth';
import type { Pasta } from '../types';

export class PastaController {
  /**
   * GET /folders
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const { raiz, pasta_pai_id, tree } = req.query;

      if (tree === 'true') {
        const pastas = PastaModel.getArvore(instituicaoId);
        res.json({ data: pastas });
        return;
      }

      const pastas = PastaModel.listarPorInstituicao(instituicaoId, { 
        raiz: raiz === 'true',
        pasta_pai_id: pasta_pai_id ? Number(pasta_pai_id) : undefined
      });

      res.json({ data: pastas });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar pastas.' } });
    }
  }

  /**
   * POST /folders
   */
  static criar(req: AuthRequest, res: Response) {
    try {
      const { nome, codigo, descricao, pasta_pai_id } = req.body;
      const instituicaoId = req.usuario!.instituicao_id;

      const id = PastaModel.criar({
        instituicao_id: instituicaoId,
        nome,
        codigo,
        descricao,
        pasta_pai_id: pasta_pai_id ? Number(pasta_pai_id) : undefined,
        departamento_id: req.usuario!.departamento_id || undefined
      });

      res.status(201).json({ data: { id, message: 'Pasta criada com sucesso.' } });
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar pasta.' } });
    }
  }

  /**
   * GET /folders/{id}
   */
  static buscarPorId(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const pasta = PastaModel.buscarPorId(id);

      if (!pasta || pasta.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pasta não encontrada.' } });
      }

      res.json({ data: pasta });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar pasta.' } });
    }
  }

  /**
   * GET /folders/{id}/subfolders
   */
  static listarSubpastas(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const subpastas = PastaModel.listarSubpastas(id);
      res.json({ data: subpastas });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar subpastas.' } });
    }
  }

  /**
   * PUT /folders/{id}
   */
  static atualizar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const pasta = PastaModel.buscarPorId(id);

      if (!pasta || pasta.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pasta não encontrada.' } });
      }

      const sucesso = PastaModel.atualizar(id, req.body);
      res.json({ data: { success: sucesso } });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar pasta.' } });
    }
  }

  /**
   * DELETE /folders/{id}
   */
  static excluir(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const pasta = PastaModel.buscarPorId(id);

      if (!pasta || pasta.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pasta não encontrada.' } });
      }

      const sucesso = PastaModel.softDelete(id, req.usuario!.id);
      res.json({ data: { success: sucesso } });
    } catch (error: any) {
      if (error.message === 'FOLDER_HAS_SUBFOLDERS') {
        return res.status(400).json({ error: { code: 'HAS_SUBFOLDERS', message: 'Não é possível excluir pasta com subpastas.' } });
      }
      if (error.message === 'FOLDER_HAS_DOCUMENTS') {
        return res.status(400).json({ error: { code: 'HAS_DOCUMENTS', message: 'Não é possível excluir pasta com documentos.' } });
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir pasta.' } });
    }
  }
}
