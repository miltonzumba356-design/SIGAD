import { getDatabase } from '../config/database';
import type { Usuario } from '../types';
import bcrypt from 'bcryptjs';

export class UsuarioModel {
  static async criar(usuario: Omit<Usuario, 'id' | 'created_at' | 'updated_at'> & { senha: string }): Promise<number> {
    const db = getDatabase();
    const senhaHash = await bcrypt.hash(usuario.senha, 10);

    const stmt = db.prepare(`
      INSERT INTO usuarios (
        instituicao_id, departamento_id, nome, email, senha_hash, cargo,
        role_id, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      usuario.instituicao_id,
      usuario.departamento_id || null,
      usuario.nome,
      usuario.email,
      senhaHash,
      usuario.cargo || null,
      usuario.role_id,
      usuario.ativo !== undefined ? (usuario.ativo ? 1 : 0) : 1
    );

    return result.lastInsertRowid as number;
  }

  static buscarPorId(id: number): Usuario | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT u.*, i.nome as instituicao_nome, d.nome as departamento_nome, r.nome as role_nome
      FROM usuarios u
      LEFT JOIN instituicoes i ON u.instituicao_id = i.id
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? AND u.deleted_at IS NULL
    `);
    return stmt.get(id) as Usuario | null;
  }

  static buscarPorEmail(email: string): Usuario | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM usuarios WHERE email = ? AND deleted_at IS NULL');
    return stmt.get(email) as Usuario | null;
  }

  static async verificarSenha(usuario: Usuario, senha: string): Promise<boolean> {
    if (!usuario.senha_hash) return false;
    return bcrypt.compare(senha, usuario.senha_hash);
  }

  static listarPorInstituicao(instituicaoId: number): Usuario[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT u.id, u.instituicao_id, u.nome, u.email, u.cargo, u.departamento_id, u.role_id, u.ativo, u.created_at,
             d.nome as departamento_nome, r.nome as role_nome
      FROM usuarios u
      LEFT JOIN departamentos d ON u.departamento_id = d.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.instituicao_id = ? AND u.deleted_at IS NULL
      ORDER BY u.nome
    `);
    return stmt.all(instituicaoId) as Usuario[];
  }

  static atualizar(id: number, dados: Partial<Usuario>): boolean {
    const db = getDatabase();
    const campos: string[] = [];
    const valores: any[] = [];

    const camposPermitidos = ['nome', 'email', 'cargo', 'departamento_id', 'role_id', 'ativo'];

    for (const campo of camposPermitidos) {
      if (campo in dados) {
        campos.push(`${campo} = ?`);
        valores.push(dados[campo as keyof Usuario]);
      }
    }

    if (campos.length === 0) return false;

    campos.push('updated_at = CURRENT_TIMESTAMP');
    valores.push(id);

    const stmt = db.prepare(`
      UPDATE usuarios
      SET ${campos.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(...valores);
    return result.changes > 0;
  }

  static async alterarSenha(id: number, novaSenha: string): Promise<boolean> {
    const db = getDatabase();
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    const stmt = db.prepare(`
      UPDATE usuarios
      SET senha_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(senhaHash, id);
    return result.changes > 0;
  }

  static desativar(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE usuarios
      SET ativo = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static softDelete(id: number, deletadoPor: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE usuarios
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, ativo = 0
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(deletadoPor, id);
    return result.changes > 0;
  }

  static restaurar(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE usuarios
      SET deleted_at = NULL, deleted_by = NULL, ativo = 1
      WHERE id = ? AND deleted_at IS NOT NULL
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
