import { Response } from 'express';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export class AuditoriaController {
  /**
   * GET /audit
   * Regra 14: Visualizar logs de auditoria da instituição
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const { user_id, acao, entidade, start_date, end_date } = req.query;

      const db = getDatabase();
      let query = `
        SELECT a.*, u.nome as usuario_nome
        FROM auditoria a
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.instituicao_id = ?
      `;
      const params: any[] = [instituicaoId];

      if (user_id) {
        query += ' AND a.usuario_id = ?';
        params.push(user_id);
      }
      if (acao) {
        query += ' AND a.acao = ?';
        params.push(acao);
      }
      if (entidade) {
        query += ' AND a.entidade = ?';
        params.push(entidade);
      }
      if (start_date) {
        query += ' AND a.created_at >= ?';
        params.push(start_date);
      }
      if (end_date) {
        query += ' AND a.created_at <= ?';
        params.push(end_date);
      }

      query += ' ORDER BY a.created_at DESC LIMIT 100';

      const logs = db.prepare(query).all(...params);
      res.json({ data: logs });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar logs de auditoria.' } });
    }
  }
}
