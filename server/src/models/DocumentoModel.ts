import { getDatabase } from '../config/database';
import type { Documento, DocumentoLocalizacao } from '../types';

export class DocumentoModel {
  static criar(documento: Omit<Documento, 'id' | 'created_at' | 'updated_at'>): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO documentos (
        instituicao_id, departamento_id, pasta_id, titulo,
        tipo, suporte, classificacao, data_documento,
        anos_retencao, notas, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      documento.instituicao_id,
      documento.departamento_id || null,
      documento.pasta_id || null,
      documento.titulo,
      documento.tipo || null,
      documento.suporte || 'DIGITAL',
      documento.classificacao || 'PUBLICO',
      documento.data_documento || null,
      documento.anos_retencao || 5,
      documento.notas || null,
      documento.created_by
    );

    return result.lastInsertRowid as number;
  }

  static buscarPorId(id: number): Documento | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT d.*, p.nome as pasta_nome, dept.nome as departamento_nome,
             dl.localizacao_id, dl.numero_caixa, dl.condicao,
             lf.nome as localizacao_nome
      FROM documentos d
      LEFT JOIN pastas p ON d.pasta_id = p.id
      LEFT JOIN departamentos dept ON d.departamento_id = dept.id
      LEFT JOIN documentos_localizacao dl ON dl.documento_id = d.id
      LEFT JOIN localizacoes_fisicas lf ON lf.id = dl.localizacao_id
      WHERE d.id = ? AND d.deleted_at IS NULL
    `);
    return stmt.get(id) as Documento | null;
  }

  static listarPorInstituicao(instituicaoId: number, filtros?: any): Documento[] {
    const db = getDatabase();
    let query = `
      SELECT d.*, p.nome as pasta_nome, lf.nome as localizacao_nome,
             dl.localizacao_id, dl.numero_caixa, dl.condicao
      FROM documentos d
      LEFT JOIN pastas p ON d.pasta_id = p.id
      LEFT JOIN documentos_localizacao dl ON dl.documento_id = d.id
      LEFT JOIN localizacoes_fisicas lf ON lf.id = dl.localizacao_id
      WHERE d.instituicao_id = ? AND d.deleted_at IS NULL
    `;
    const params: any[] = [instituicaoId];

    if (filtros?.pasta_id) {
      query += ' AND d.pasta_id = ?';
      params.push(filtros.pasta_id);
    } else if (filtros?.somente_raiz) {
      query += ' AND d.pasta_id IS NULL';
    }
    if (filtros?.classificacao) {
      query += ' AND d.classificacao = ?';
      params.push(filtros.classificacao);
    }
    if (filtros?.busca) {
      query += ' AND (d.titulo LIKE ? OR d.notas LIKE ?)';
      const busca = `%${filtros.busca}%`;
      params.push(busca, busca);
    }
    if (filtros?.localizacao_id) {
      query += ' AND dl.localizacao_id = ?';
      params.push(filtros.localizacao_id);
    }

    query += ' ORDER BY d.created_at DESC';

    return db.prepare(query).all(...params) as Documento[];
  }

  static definirLocalizacao(dados: DocumentoLocalizacao): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO documentos_localizacao (
        documento_id, localizacao_id, numero_caixa, condicao, notas_condicao
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(documento_id) DO UPDATE SET
        localizacao_id = excluded.localizacao_id,
        numero_caixa = excluded.numero_caixa,
        condicao = excluded.condicao,
        notas_condicao = excluded.notas_condicao,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      dados.documento_id,
      dados.localizacao_id,
      dados.numero_caixa || null,
      dados.condicao || 'GOOD',
      dados.notas_condicao || null
    );
  }

  static atualizar(id: number, dados: Partial<Documento>): boolean {
    const db = getDatabase();
    const campos: string[] = [];
    const valores: any[] = [];

    const camposPermitidos = [
      'pasta_id', 'titulo', 'tipo', 'suporte', 'classificacao',
      'data_documento', 'anos_retencao', 'notas', 'departamento_id'
    ];

    for (const campo of camposPermitidos) {
      if (campo in dados) {
        campos.push(`${campo} = ?`);
        valores.push(dados[campo as keyof Documento]);
      }
    }

    if (campos.length === 0) return false;

    campos.push('updated_at = CURRENT_TIMESTAMP');
    valores.push(id);

    const stmt = db.prepare(`
      UPDATE documentos
      SET ${campos.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `);

    const result = stmt.run(...valores);
    return result.changes > 0;
  }

  static softDelete(id: number, deletadoPor: number): boolean {
    const db = getDatabase();
    
    // Regra 1.8: Empréstimos ativos bloqueiam o soft delete
    const emprestimoAtivo = db.prepare(`
      SELECT COUNT(*) as count FROM emprestimos 
      WHERE documento_id = ? AND estado IN ('PENDENTE', 'APROVADO')
    `).get(id) as { count: number };

    if (emprestimoAtivo.count > 0) {
      throw new Error('DOCUMENT_HAS_ACTIVE_LOAN');
    }

    const stmt = db.prepare(`
      UPDATE documentos
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
      WHERE id = ? AND deleted_at IS NULL
    `);
    const result = stmt.run(deletadoPor, id);
    return result.changes > 0;
  }

  static restaurar(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE documentos
      SET deleted_at = NULL, deleted_by = NULL
      WHERE id = ? AND deleted_at IS NOT NULL
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Calcula estatísticas reais para o Dashboard (Regra 12/15)
   */
  static getStats(instituicaoId: number) {
    const db = getDatabase();
    
    const stats = {
      total: 0,
      digitalizados: 0,
      fisicos: 0,
      emprestimos_ativos: 0,
      atrasados: 0,
      pendentes_dig: 0,
      porTipo: [] as any[]
    };

    // Total e por Suporte
    const totalRes = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN suporte = 'DIGITAL' OR suporte = 'AMBOS' THEN 1 ELSE 0 END) as digital,
        SUM(CASE WHEN suporte = 'FISICO' OR suporte = 'AMBOS' THEN 1 ELSE 0 END) as fisico
      FROM documentos 
      WHERE instituicao_id = ? AND deleted_at IS NULL
    `).get(instituicaoId) as any;

    stats.total = totalRes.total || 0;
    stats.digitalizados = totalRes.digital || 0;
    stats.fisicos = totalRes.fisico || 0;

    // Empréstimos
    const loanRes = db.prepare(`
      SELECT 
        COUNT(*) as ativos,
        SUM(CASE WHEN data_prevista_devolucao < CURRENT_DATE THEN 1 ELSE 0 END) as atrasados
      FROM emprestimos 
      WHERE instituicao_id = ? AND estado = 'APROVADO'
    `).get(instituicaoId) as any;

    stats.emprestimos_ativos = loanRes.ativos || 0;
    stats.atrasados = loanRes.atrasados || 0;

    // Fila Digitalização
    const digitRes = db.prepare(`
      SELECT COUNT(*) as pendentes
      FROM fila_digitalizacao 
      WHERE instituicao_id = ? AND estado != 'CONCLUIDO'
    `).get(instituicaoId) as any;

    stats.pendentes_dig = digitRes.pendentes || 0;

    // Agrupamento por tipo de documento
    stats.porTipo = db.prepare(`
      SELECT tipo as nome, COUNT(*) as count
      FROM documentos
      WHERE instituicao_id = ? AND deleted_at IS NULL
      GROUP BY tipo
      LIMIT 5
    `).all(instituicaoId) as any[];

    return stats;
  }
}
