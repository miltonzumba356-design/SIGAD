import { getDatabase } from '../config/database';
import type { Departamento } from '../types';

export class DepartamentoModel {
  static criar(departamento: Omit<Departamento, 'id' | 'created_at' | 'updated_at'>): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO departamentos (instituicao_id, nome, descricao, responsavel)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      departamento.instituicao_id,
      departamento.nome,
      departamento.descricao || null,
      departamento.responsavel || null
    );

    return result.lastInsertRowid as number;
  }

  static listarPorInstituicao(instituicaoId: number): Departamento[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM departamentos WHERE instituicao_id = ? AND deleted_at IS NULL ORDER BY nome');
    return stmt.all(instituicaoId) as Departamento[];
  }

  static buscarPorId(id: number): Departamento | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM departamentos WHERE id = ? AND deleted_at IS NULL');
    return stmt.get(id) as Departamento | null;
  }

  static atualizar(id: number, dados: Partial<Departamento>): boolean {
    const db = getDatabase();
    const campos: string[] = [];
    const valores: any[] = [];

    const camposPermitidos = ['nome', 'descricao', 'responsavel'];

    for (const campo of camposPermitidos) {
      if (campo in dados) {
        campos.push(`${campo} = ?`);
        valores.push(dados[campo as keyof Departamento]);
      }
    }

    if (campos.length === 0) return false;

    campos.push('updated_at = CURRENT_TIMESTAMP');
    valores.push(id);

    const stmt = db.prepare(`
      UPDATE departamentos
      SET ${campos.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(...valores);
    return result.changes > 0;
  }

  static softDelete(id: number, deletadoPor: number): boolean {
    const db = getDatabase();
    
    // Verificar se há usuários vinculados
    const usuarios = db.prepare('SELECT COUNT(*) as count FROM usuarios WHERE departamento_id = ? AND deleted_at IS NULL').get(id) as { count: number };
    if (usuarios.count > 0) {
      throw new Error('DEPT_HAS_USERS');
    }

    const stmt = db.prepare(`
      UPDATE departamentos
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(deletadoPor, id);
    return result.changes > 0;
  }
}
