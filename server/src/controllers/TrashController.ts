import { Response } from 'express';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { DocumentoModel } from '../models/DocumentoModel';
import { UsuarioModel } from '../models/UsuarioModel';

export class TrashController {
  /**
   * GET /trash
   * Regra 16: Lista itens eliminados (soft delete)
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const db = getDatabase();

      const documentos = db.prepare(`
        SELECT 'documento' as tipo, id, titulo as nome, deleted_at, deleted_by
        FROM documentos WHERE instituicao_id = ? AND deleted_at IS NOT NULL
      `).all(instituicaoId);

      const usuarios = db.prepare(`
        SELECT 'usuario' as tipo, id, nome, deleted_at, deleted_by
        FROM usuarios WHERE instituicao_id = ? AND deleted_at IS NOT NULL
      `).all(instituicaoId);

      res.json({ data: [...documentos, ...usuarios] });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar reciclagem.' } });
    }
  }

  /**
   * POST /trash/{tipo}/{id}/restore
   */
  static restaurar(req: AuthRequest, res: Response) {
    try {
      const { tipo, id } = req.params;
      let sucesso = false;

      if (tipo === 'documento') {
        sucesso = DocumentoModel.restaurar(Number(id));
      } else if (tipo === 'usuario') {
        sucesso = UsuarioModel.restaurar(Number(id));
      }

      if (sucesso) {
        res.json({ data: { message: 'Item restaurado com sucesso.' } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item não encontrado na reciclagem.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao restaurar item.' } });
    }
  }
}
