import { getDatabase } from '../config/database';
import type { Instituicao } from '../types';

export class InstituicaoModel {
  static criar(instituicao: Omit<Instituicao, 'id' | 'created_at' | 'updated_at'>): number {
    const db = getDatabase();
    const existente = db.prepare('SELECT id FROM instituicoes WHERE codigo = ? AND deleted_at IS NULL').get(instituicao.codigo);
    if (existente) {
      throw new Error('INSTITUTION_CODE_EXISTS');
    }

    const stmt = db.prepare(`
      INSERT INTO instituicoes (codigo, nome, sigla, admin_email, storage_limit_gb)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      instituicao.codigo,
      instituicao.nome,
      instituicao.sigla || null,
      instituicao.admin_email || null,
      instituicao.storage_limit_gb || 10
    );

    return result.lastInsertRowid as number;
  }

  static buscarPorId(id: number): Instituicao | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM instituicoes WHERE id = ? AND deleted_at IS NULL');
    return stmt.get(id) as Instituicao | null;
  }

  static listarTodas(): Instituicao[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM instituicoes WHERE deleted_at IS NULL ORDER BY nome');
    return stmt.all() as Instituicao[];
  }

  static atualizar(id: number, dados: Partial<Instituicao>): boolean {
    const db = getDatabase();
    const campos: string[] = [];
    const valores: any[] = [];

    const camposPermitidos = ['nome', 'sigla', 'admin_email', 'storage_limit_gb', 'ativo'];

    for (const campo of camposPermitidos) {
      if (campo in dados) {
        campos.push(`${campo} = ?`);
        valores.push(dados[campo as keyof Instituicao]);
      }
    }

    if (campos.length === 0) return false;

    campos.push('updated_at = CURRENT_TIMESTAMP');
    valores.push(id);

    const stmt = db.prepare(`
      UPDATE instituicoes
      SET ${campos.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(...valores);
    return result.changes > 0;
  }

  static softDelete(id: number, deletadoPor: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE instituicoes
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, ativo = 0
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(deletadoPor, id);
    return result.changes > 0;
  }

  static getStats(id: number) {
    const db = getDatabase();
    const stats = {
      usuarios: (db.prepare('SELECT COUNT(*) as count FROM usuarios WHERE instituicao_id = ? AND deleted_at IS NULL').get(id) as any).count,
      documentos: (db.prepare('SELECT COUNT(*) as count FROM documentos WHERE instituicao_id = ? AND deleted_at IS NULL').get(id) as any).count,
      armazenamento_usado: (db.prepare('SELECT storage_used_bytes FROM instituicoes WHERE id = ?').get(id) as any).storage_used_bytes,
      limite_armazenamento: (db.prepare('SELECT storage_limit_gb FROM instituicoes WHERE id = ?').get(id) as any).storage_limit_gb
    };
    return stats;
  }
}
