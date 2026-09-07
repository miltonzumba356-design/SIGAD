import { getDatabase } from '../config/database';

export class FilaDigitalizacaoModel {
  static adicionar(dados: {
    instituicao_id: number,
    documento_id: number,
    solicitado_por: number,
    prioridade?: string,
    notas?: string,
    tipo_fila?: 'DIGITAL' | 'FISICA',
    localizacao_id?: number,
    numero_caixa?: string,
    condicao?: string
  }): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO fila_digitalizacao (
        instituicao_id, documento_id, solicitado_por, prioridade, notas, estado,
        tipo_fila, localizacao_id, numero_caixa, condicao
      )
      VALUES (?, ?, ?, ?, ?, 'PENDENTE', ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dados.instituicao_id,
      dados.documento_id,
      dados.solicitado_por,
      dados.prioridade || 'NORMAL',
      dados.notas || null,
      dados.tipo_fila || 'DIGITAL',
      dados.localizacao_id || null,
      dados.numero_caixa || null,
      dados.condicao || null
    );

    return result.lastInsertRowid as number;
  }

  static listarPorInstituicao(instituicaoId: number, filtros: { estado?: string, tipo_fila?: string } = {}): any[] {
    const db = getDatabase();
    let query = `
      SELECT f.*, d.titulo as documento_titulo, u.nome as solicitante_nome,
             COALESCE(f.numero_caixa, dl.numero_caixa) as numero_caixa,
             COALESCE(f.condicao, dl.condicao) as condicao,
             lf.nome as localizacao_nome,
             d.suporte as documento_suporte
      FROM fila_digitalizacao f
      JOIN documentos d ON f.documento_id = d.id
      JOIN usuarios u ON f.solicitado_por = u.id
      LEFT JOIN documentos_localizacao dl ON dl.documento_id = d.id
      LEFT JOIN localizacoes_fisicas lf ON lf.id = COALESCE(f.localizacao_id, dl.localizacao_id)
      WHERE f.instituicao_id = ?
        AND d.deleted_at IS NULL
    `;
    const params: any[] = [instituicaoId];

    if (filtros.estado) {
      query += ' AND f.estado = ?';
      params.push(filtros.estado);
    }
    if (filtros.tipo_fila) {
      query += ' AND f.tipo_fila = ?';
      params.push(filtros.tipo_fila);
    }

    query += " ORDER BY CASE f.prioridade WHEN 'URGENT' THEN 1 WHEN 'NORMAL' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END, f.data_solicitacao ASC";
    return db.prepare(query).all(...params);
  }

  static assumir(id: number, instituicaoId: number, operadorId: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE fila_digitalizacao
      SET estado = 'EM_CURSO', operador_id = ?, data_inicio = CURRENT_TIMESTAMP
      WHERE id = ? AND instituicao_id = ? AND estado = 'PENDENTE'
    `);
    const result = stmt.run(operadorId, id, instituicaoId);
    return result.changes > 0;
  }

  static concluir(id: number, instituicaoId: number, dados: { ocr_text?: string }): { sucesso: boolean, documento_id?: number } {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      const item = db.prepare(`
        SELECT documento_id
        FROM fila_digitalizacao
        WHERE id = ? AND instituicao_id = ? AND estado IN ('PENDENTE', 'EM_CURSO')
      `).get(id, instituicaoId) as { documento_id: number } | undefined;

      if (!item) {
        return { sucesso: false };
      }

      db.prepare(`
        UPDATE fila_digitalizacao
        SET estado = 'CONCLUIDO', data_conclusao = CURRENT_TIMESTAMP, ocr_texto = ?
        WHERE id = ? AND instituicao_id = ?
      `).run(dados.ocr_text || null, id, instituicaoId);

      db.prepare(`
        UPDATE documentos
        SET suporte = CASE WHEN suporte = 'FISICO' THEN 'AMBOS' ELSE suporte END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND instituicao_id = ?
      `).run(item.documento_id, instituicaoId);

      return { sucesso: true, documento_id: item.documento_id };
    });

    return transaction();
  }
}
