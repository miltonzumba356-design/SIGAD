import { getDatabase } from '../config/database';

export class RelatorioModel {
  static criar(dados: { instituicao_id: number, usuario_id: number, nome: string, tipo: string, filtros?: any }): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO relatorios (instituicao_id, usuario_id, tipo, parametros, estado)
      VALUES (?, ?, ?, ?, 'GERANDO')
    `);

    const result = stmt.run(
      dados.instituicao_id,
      dados.usuario_id,
      dados.tipo || dados.nome,
      JSON.stringify({ nome: dados.nome, filtros: dados.filtros || {} })
    );

    return result.lastInsertRowid as number;
  }

  static listarPorInstituicao(instituicaoId: number): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT r.*, u.nome as usuario_nome
      FROM relatorios r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE r.instituicao_id = ?
      ORDER BY r.created_at DESC
    `).all(instituicaoId);
  }

  static atualizarStatus(id: number, estado: string, caminhoFicheiro?: string, erro?: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE relatorios
      SET estado = ?, caminho_ficheiro = ?
      WHERE id = ?
    `).run(estado, caminhoFicheiro || erro || null, id);
  }
}
