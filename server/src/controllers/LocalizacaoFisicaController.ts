import { Response } from 'express';
import { LocalizacaoFisicaModel } from '../models/LocalizacaoFisicaModel';
import { AuthRequest } from '../middleware/auth';

export class LocalizacaoFisicaController {
  /**
   * GET /physical-archive
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const { parent_id } = req.query;
      const localizacoes = LocalizacaoFisicaModel.listarPorInstituicao(
        instituicaoId, 
        parent_id ? Number(parent_id) : undefined
      );
      res.json({ data: localizacoes });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar localizações.' } });
    }
  }

  /**
   * GET /physical-archive/tree
   */
  static arvore(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const arvore = LocalizacaoFisicaModel.getArvore(instituicaoId);
      res.json({ data: arvore });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao obter árvore de arquivo.' } });
    }
  }

  /**
   * POST /physical-archive
   */
  static criar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const { nome, tipo, parent_id } = req.body;

      if (!nome || !tipo) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Nome e tipo sao obrigatorios.' } });
      }

      if (!['EDIFICIO', 'SALA', 'ESTANTE', 'PRATELEIRA', 'CAIXA'].includes(tipo)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Tipo de localizacao invalido.' } });
      }

      if (parent_id) {
        const parent = LocalizacaoFisicaModel.buscarPorId(Number(parent_id));
        if (!parent || parent.instituicao_id !== instituicaoId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localizacao superior nao encontrada.' } });
        }
      }

      const id = LocalizacaoFisicaModel.criar({
        ...req.body,
        parent_id: parent_id ? Number(parent_id) : undefined,
        instituicao_id: instituicaoId
      });
      res.status(201).json({ data: { id, message: 'Localização criada com sucesso.' } });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar localização.' } });
    }
  }

  /**
   * GET /physical-archive/{id}
   */
  static buscar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const localizacao = LocalizacaoFisicaModel.buscarPorId(id);

      if (!localizacao || localizacao.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localização não encontrada.' } });
      }

      res.json({ data: localizacao });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar localização.' } });
    }
  }

  /**
   * PUT /physical-archive/{id}
   */
  static atualizar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const localizacao = LocalizacaoFisicaModel.buscarPorId(id);

      if (!localizacao || localizacao.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localização não encontrada.' } });
      }

      const sucesso = LocalizacaoFisicaModel.atualizar(id, req.body);
      if (sucesso) {
        res.json({ data: { message: 'Localização atualizada com sucesso.' } });
      } else {
        res.status(400).json({ error: { code: 'UPDATE_FAILED', message: 'Nenhuma alteração realizada.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar localização.' } });
    }
  }

  /**
   * DELETE /physical-archive/{id}
   */
  static excluir(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const localizacao = LocalizacaoFisicaModel.buscarPorId(id);

      if (!localizacao || localizacao.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localização não encontrada.' } });
      }

      const sucesso = LocalizacaoFisicaModel.softDelete(id, req.usuario!.id);
      if (sucesso) {
        res.json({ data: { message: 'Localização excluída com sucesso.' } });
      } else {
        res.status(400).json({ error: { code: 'DELETE_FAILED', message: 'Não foi possível excluir a localização.' } });
      }
    } catch (error: any) {
      if (error.message === 'LOCATION_HAS_CHILDREN') {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Localização com sub-divisões não pode ser eliminada.' } });
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir localização.' } });
    }
  }
}
