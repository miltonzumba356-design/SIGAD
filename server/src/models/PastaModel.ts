import { getDatabase } from '../config/database';
import type { Pasta } from '../types';

export class PastaModel {
  static criar(pasta: Omit<Pasta, 'id' | 'created_at' | 'updated_at'>): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO pastas (
        instituicao_id, departamento_id, pasta_pai_id, codigo, nome, descricao
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      pasta.instituicao_id,
      pasta.departamento_id || null,
      pasta.pasta_pai_id || null,
      pasta.codigo || null,
      pasta.nome,
      pasta.descricao || null
    );

    return result.lastInsertRowid as number;
  }

  static buscarPorId(id: number): Pasta | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT p.*, pp.nome as pasta_pai_nome
      FROM pastas p
      LEFT JOIN pastas pp ON p.pasta_pai_id = pp.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `);
    return stmt.get(id) as Pasta | null;
  }

  static listarPorInstituicao(instituicaoId: number, filtros?: any): Pasta[] {
    const db = getDatabase();
    let query = `
      SELECT p.*, pp.nome as pasta_pai_nome
      FROM pastas p
      LEFT JOIN pastas pp ON p.pasta_pai_id = pp.id
      WHERE p.instituicao_id = ? AND p.deleted_at IS NULL
    `;
    const params: any[] = [instituicaoId];

    if (filtros?.raiz) {
      query += ' AND p.pasta_pai_id IS NULL';
    } else if (filtros?.pasta_pai_id) {
      query += ' AND p.pasta_pai_id = ?';
      params.push(filtros.pasta_pai_id);
    }

    query += ' ORDER BY p.nome ASC';

    return db.prepare(query).all(...params) as Pasta[];
  }

  static listarSubpastas(pastaId: number): Pasta[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM pastas 
      WHERE pasta_pai_id = ? AND deleted_at IS NULL
      ORDER BY nome ASC
    `);
    return stmt.all(pastaId) as Pasta[];
  }

  static getArvore(instituicaoId: number): Array<Pasta & { children: any[] }> {
    const db = getDatabase();
    const todas = db.prepare(`
      SELECT *
      FROM pastas
      WHERE instituicao_id = ? AND deleted_at IS NULL
      ORDER BY nome ASC
    `).all(instituicaoId) as Pasta[];

    const construirArvore = (parentId: number | null = null): Array<Pasta & { children: any[] }> => {
      return todas
        .filter(pasta => (pasta.pasta_pai_id ?? null) === parentId)
        .map(pasta => ({
          ...pasta,
          children: construirArvore(pasta.id!)
        }));
    };

    return construirArvore(null);
  }

  static atualizar(id: number, dados: Partial<Pasta>): boolean {
    const db = getDatabase();
    const campos: string[] = [];
    const valores: any[] = [];

    const camposPermitidos = ['pasta_pai_id', 'codigo', 'nome', 'descricao'];

    for (const campo of camposPermitidos) {
      if (campo in dados) {
        campos.push(`${campo} = ?`);
        valores.push(dados[campo as keyof Pasta]);
      }
    }

    if (campos.length === 0) return false;

    campos.push('updated_at = CURRENT_TIMESTAMP');
    valores.push(id);

    const stmt = db.prepare(`
      UPDATE pastas
      SET ${campos.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(...valores);
    return result.changes > 0;
  }

  static softDelete(id: number, deletadoPor: number): boolean {
    const db = getDatabase();
    
    // Verificar subpastas
    const temSub = db.prepare('SELECT COUNT(*) as count FROM pastas WHERE pasta_pai_id = ? AND deleted_at IS NULL').get(id) as any;
    if (temSub.count > 0) throw new Error('FOLDER_HAS_SUBFOLDERS');

    // Verificar documentos
    const temDocs = db.prepare('SELECT COUNT(*) as count FROM documentos WHERE pasta_id = ? AND deleted_at IS NULL').get(id) as any;
    if (temDocs.count > 0) throw new Error('FOLDER_HAS_DOCUMENTS');

    const stmt = db.prepare(`
      UPDATE pastas 
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ? 
      WHERE id = ?
    `);
    const result = stmt.run(deletadoPor, id);
    return result.changes > 0;
  }
}
