import { getDatabase } from '../config/database';

export class FicheiroModel {
  static criar(dados: {
    documento_id: number,
    nome_interno: string,
    nome_original: string,
    tipo_mime: string,
    tamanho_bytes: number,
    created_by: number
  }): number {
    const db = getDatabase();
    const latest = db.prepare(`
      SELECT COALESCE(MAX(versao), 0) as versao
      FROM ficheiros
      WHERE documento_id = ?
    `).get(dados.documento_id) as { versao: number };
    const nextVersion = (latest.versao || 0) + 1;

    const stmt = db.prepare(`
      INSERT INTO ficheiros (
        documento_id, nome_interno, nome_original, tipo_mime, tamanho_bytes, versao, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      dados.documento_id,
      dados.nome_interno,
      dados.nome_original,
      dados.tipo_mime,
      dados.tamanho_bytes,
      nextVersion,
      dados.created_by
    );

    return result.lastInsertRowid as number;
  }

  static buscarPorDocumento(documentoId: number) {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM ficheiros WHERE documento_id = ? ORDER BY versao DESC, id DESC
    `).all(documentoId);
  }
}
