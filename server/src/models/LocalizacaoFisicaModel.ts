import { getDatabase } from '../config/database';
import type { LocalizacaoFisica } from '../types';

export class LocalizacaoFisicaModel {
  static criar(dados: Omit<LocalizacaoFisica, 'id' | 'created_at' | 'updated_at'>): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO localizacoes_fisicas (instituicao_id, parent_id, nome, tipo, codigo_barras, capacidade_caixas)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dados.instituicao_id,
      dados.parent_id || null,
      dados.nome,
      dados.tipo,
      dados.codigo_barras || null,
      dados.capacidade_caixas || null
    );

    return result.lastInsertRowid as number;
  }

  static listarPorInstituicao(instituicaoId: number, parentId?: number): LocalizacaoFisica[] {
    const db = getDatabase();
    let query = 'SELECT * FROM localizacoes_fisicas WHERE instituicao_id = ? AND deleted_at IS NULL';
    const params: any[] = [instituicaoId];

    if (parentId !== undefined) {
      query += ' AND parent_id = ?';
      params.push(parentId);
    } else {
      query += ' AND parent_id IS NULL';
    }

    query += ' ORDER BY nome';
    return db.prepare(query).all(...params) as LocalizacaoFisica[];
  }

  static buscarPorId(id: number): LocalizacaoFisica | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM localizacoes_fisicas WHERE id = ? AND deleted_at IS NULL');
    return stmt.get(id) as LocalizacaoFisica | null;
  }

  static getCaminho(id: number): string {
    const db = getDatabase();
    const rows = db.prepare(`
      WITH RECURSIVE caminho(id, parent_id, nome, nivel) AS (
        SELECT id, parent_id, nome, 0
        FROM localizacoes_fisicas
        WHERE id = ? AND deleted_at IS NULL
        UNION ALL
        SELECT l.id, l.parent_id, l.nome, caminho.nivel + 1
        FROM localizacoes_fisicas l
        JOIN caminho ON caminho.parent_id = l.id
        WHERE l.deleted_at IS NULL
      )
      SELECT nome FROM caminho ORDER BY nivel DESC
    `).all(id) as Array<{ nome: string }>;

    return rows.map(row => row.nome).join(' / ');
  }

  static atualizar(id: number, dados: Partial<LocalizacaoFisica>): boolean {
    const db = getDatabase();
    const campos: string[] = [];
    const valores: any[] = [];

    const camposPermitidos = ['nome', 'tipo', 'codigo_barras', 'capacidade_caixas', 'ocupacao_atual'];

    for (const campo of camposPermitidos) {
      if (campo in dados) {
        campos.push(`${campo} = ?`);
        valores.push(dados[campo as keyof LocalizacaoFisica]);
      }
    }

    if (campos.length === 0) return false;

    campos.push('updated_at = CURRENT_TIMESTAMP');
    valores.push(id);

    const stmt = db.prepare(`
      UPDATE localizacoes_fisicas
      SET ${campos.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(...valores);
    return result.changes > 0;
  }

  static softDelete(id: number, deletadoPor: number): boolean {
    const db = getDatabase();
    
    // Verificar se há sub-localizações
    const filhos = db.prepare('SELECT COUNT(*) as count FROM localizacoes_fisicas WHERE parent_id = ? AND deleted_at IS NULL').get(id) as { count: number };
    if (filhos.count > 0) {
      throw new Error('LOCATION_HAS_CHILDREN');
    }

    const stmt = db.prepare(`
      UPDATE localizacoes_fisicas
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(deletadoPor, id);
    return result.changes > 0;
  }

  static getArvore(instituicaoId: number) {
    const db = getDatabase();
    const todas = db.prepare(`
      SELECT l.*, COUNT(dl.documento_id) as documentos_count
      FROM localizacoes_fisicas l
      LEFT JOIN documentos_localizacao dl ON dl.localizacao_id = l.id
      LEFT JOIN documentos d ON d.id = dl.documento_id AND d.deleted_at IS NULL
      WHERE l.instituicao_id = ? AND l.deleted_at IS NULL
      GROUP BY l.id
      ORDER BY l.nome
    `).all(instituicaoId) as Array<LocalizacaoFisica & { documentos_count: number }>;
    
    const construirArvore = (parentId: number | null = null): any[] => {
      return todas
        .filter(loc => loc.parent_id === (parentId === null ? null : parentId))
        .map(loc => ({
          ...loc,
          children: construirArvore(loc.id)
        }));
    };

    return construirArvore(null);
  }
}
