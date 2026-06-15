import { getDatabase } from '../config/database';

export interface Role {
  id: number;
  nome: string;
  descricao: string;
}

export class RoleModel {
  /**
   * Lista todos os perfis (roles) do sistema
   */
  static listarTodas(): Role[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT id, nome, descricao FROM roles ORDER BY id');
    return stmt.all() as Role[];
  }

  /**
   * Busca um perfil por ID
   */
  static buscarPorId(id: number): Role | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM roles WHERE id = ?');
    return stmt.get(id) as Role | null;
  }
}
