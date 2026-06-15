import { getDatabase } from '../config/database';

export interface Emprestimo {
  id: number;
  instituicao_id: number;
  documento_id: number;
  requisitante_id: number;
  data_pedido: string;
  data_prevista_devolucao: string;
  data_devolucao_real?: string;
  motivo: string;
  estado: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'DEVOLVIDO';
  notas_devolucao?: string;
  aprovado_por?: number;
}

export class EmprestimoModel {
  static solicitar(dados: { instituicao_id: number, documento_id: number, requisitante_id: number, data_prevista_devolucao: string, motivo: string }): number {
    const db = getDatabase();
    
    // Regra 9: Verificar se o documento já está emprestado
    const ocupado = db.prepare(`
      SELECT COUNT(*) as count FROM emprestimos 
      WHERE documento_id = ? AND estado IN ('PENDENTE', 'APROVADO')
    `).get(dados.documento_id) as { count: number };

    if (ocupado.count > 0) {
      throw new Error('DOCUMENT_ALREADY_LOANED');
    }

    const stmt = db.prepare(`
      INSERT INTO emprestimos (instituicao_id, documento_id, requisitante_id, data_prevista_devolucao, motivo, estado)
      VALUES (?, ?, ?, ?, ?, 'PENDENTE')
    `);

    const result = stmt.run(
      dados.instituicao_id,
      dados.documento_id,
      dados.requisitante_id,
      dados.data_prevista_devolucao,
      dados.motivo
    );

    return result.lastInsertRowid as number;
  }

  static responder(id: number, aprovador_id: number, aprovado: boolean, notas?: string): boolean {
    const db = getDatabase();
    const estado = aprovado ? 'APROVADO' : 'REJEITADO';
    
    const stmt = db.prepare(`
      UPDATE emprestimos
      SET estado = ?, aprovado_por = ?, notas_devolucao = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND estado = 'PENDENTE'
    `);

    const result = stmt.run(estado, aprovador_id, notas || null, id);
    return result.changes > 0;
  }

  static registrarDevolucao(id: number, notas?: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE emprestimos
      SET estado = 'DEVOLVIDO', data_devolucao_real = CURRENT_TIMESTAMP, notas_devolucao = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND estado = 'APROVADO'
    `);

    const result = stmt.run(notas || null, id);
    return result.changes > 0;
  }

  static listarPorInstituicao(instituicaoId: number, filtros?: any): any[] {
    const db = getDatabase();
    let query = `
      SELECT e.*, d.titulo as documento_titulo, u.nome as usuario_nome,
             dep.nome as departamento_nome
      FROM emprestimos e
      JOIN documentos d ON e.documento_id = d.id
      JOIN usuarios u ON e.requisitante_id = u.id
      LEFT JOIN departamentos dep ON u.departamento_id = dep.id
      WHERE e.instituicao_id = ?
    `;
    const params: any[] = [instituicaoId];

    if (filtros?.estado) {
      query += ' AND e.estado = ?';
      params.push(filtros.estado);
    }

    query += ' ORDER BY e.created_at DESC';
    return db.prepare(query).all(...params);
  }

  static buscarPorId(id: number): any | null {
    const db = getDatabase();
    return db.prepare(`
      SELECT e.*, d.titulo as documento_titulo, d.instituicao_id, u.nome as usuario_nome
      FROM emprestimos e
      JOIN documentos d ON e.documento_id = d.id
      JOIN usuarios u ON e.requisitante_id = u.id
      WHERE e.id = ?
    `).get(id);
  }
}
