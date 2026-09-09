import { getDatabase } from '../config/database';

export class AutorizacaoDownloadModel {
  static solicitar(documentoId: number, usuarioId: number, motivo?: string): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO autorizacoes_download (documento_id, usuario_id, motivo, estado)
      VALUES (?, ?, ?, 'PENDENTE')
    `);
    const result = stmt.run(documentoId, usuarioId, motivo || null);
    return result.lastInsertRowid as number;
  }

  static temPedidoPendente(documentoId: number, usuarioId: number): boolean {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM autorizacoes_download
      WHERE documento_id = ? AND usuario_id = ? AND estado = 'PENDENTE'
    `).get(documentoId, usuarioId) as { count: number };
    return row.count > 0;
  }

  static temAutorizacaoAprovada(documentoId: number, usuarioId: number): boolean {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM autorizacoes_download
      WHERE documento_id = ? AND usuario_id = ? AND estado = 'APROVADO'
    `).get(documentoId, usuarioId) as { count: number };
    return row.count > 0;
  }

  static listarDocumentosAutorizados(usuarioId: number): number[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT DISTINCT documento_id FROM autorizacoes_download
      WHERE usuario_id = ? AND estado = 'APROVADO'
    `).all(usuarioId) as Array<{ documento_id: number }>;
    return rows.map(row => row.documento_id);
  }

  static listarPorInstituicao(instituicaoId: number, estado?: string): any[] {
    const db = getDatabase();
    let query = `
      SELECT ad.*, d.titulo as documento_titulo, u.nome as usuario_nome, a.nome as aprovado_por_nome
      FROM autorizacoes_download ad
      JOIN documentos d ON ad.documento_id = d.id
      JOIN usuarios u ON ad.usuario_id = u.id
      LEFT JOIN usuarios a ON ad.aprovado_por = a.id
      WHERE d.instituicao_id = ?
    `;
    const params: any[] = [instituicaoId];
    if (estado) {
      query += ' AND ad.estado = ?';
      params.push(estado);
    }
    query += ' ORDER BY ad.created_at DESC';
    return db.prepare(query).all(...params);
  }

  static buscarPorId(id: number): any | null {
    const db = getDatabase();
    return db.prepare(`
      SELECT ad.*, d.instituicao_id
      FROM autorizacoes_download ad
      JOIN documentos d ON ad.documento_id = d.id
      WHERE ad.id = ?
    `).get(id);
  }

  static responder(id: number, aprovadoPor: number, aprovado: boolean, notas?: string): boolean {
    const db = getDatabase();
    const estado = aprovado ? 'APROVADO' : 'REJEITADO';
    const stmt = db.prepare(`
      UPDATE autorizacoes_download
      SET estado = ?, aprovado_por = ?, notas_resposta = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND estado = 'PENDENTE'
    `);
    const result = stmt.run(estado, aprovadoPor, notas || null, id);
    return result.changes > 0;
  }
}
