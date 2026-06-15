import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database/sigad.db');

type SqliteDatabase = any;

let db: SqliteDatabase | null = null;

function hasColumn(database: SqliteDatabase, table: string, column: string): boolean {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some(col => col.name === column);
}

function hasTable(database: SqliteDatabase, table: string): boolean {
  const result = database.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(table) as { name?: string } | undefined;
  return Boolean(result?.name);
}

function ensureSchemaCompatibility(database: SqliteDatabase): void {
  const addColumn = (table: string, column: string, definition: string) => {
    if (hasTable(database, table) && !hasColumn(database, table, column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  addColumn('departamentos', 'responsavel', 'VARCHAR(255)');
  addColumn('localizacoes_fisicas', 'codigo_barras', 'VARCHAR(100)');
  addColumn('localizacoes_fisicas', 'capacidade_caixas', 'INTEGER');
  addColumn('localizacoes_fisicas', 'ocupacao_atual', 'INTEGER DEFAULT 0');
  addColumn('pastas', 'codigo', 'VARCHAR(50)');
  addColumn('pastas', 'departamento_id', 'INTEGER');
  addColumn('documentos', 'departamento_id', 'INTEGER');
  addColumn('sessoes', 'contexto_instituicao_id', 'INTEGER');
  addColumn('fila_digitalizacao', 'tipo_fila', "VARCHAR(20) DEFAULT 'DIGITAL'");
  addColumn('fila_digitalizacao', 'localizacao_id', 'INTEGER');
  addColumn('fila_digitalizacao', 'numero_caixa', 'VARCHAR(100)');
  addColumn('fila_digitalizacao', 'condicao', 'VARCHAR(50)');

  if (hasTable(database, 'documentos') && hasTable(database, 'localizacoes_fisicas')) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS documentos_localizacao (
        documento_id INTEGER PRIMARY KEY,
        localizacao_id INTEGER NOT NULL,
        numero_caixa VARCHAR(100),
        condicao VARCHAR(50) DEFAULT 'GOOD',
        notas_condicao TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (documento_id) REFERENCES documentos(id),
        FOREIGN KEY (localizacao_id) REFERENCES localizacoes_fisicas(id)
      );
    `);
  }

  // Garantir que os perfis administrativos tenham permissões (Auto-Reparação 403)
  database.exec(`
    CREATE TABLE IF NOT EXISTS digitalizacoes_pendentes (
      id TEXT PRIMARY KEY,
      instituicao_id INTEGER NOT NULL,
      solicitado_por INTEGER NOT NULL,
      nome_interno TEXT NOT NULL,
      nome_original TEXT NOT NULL,
      tipo_mime TEXT NOT NULL,
      tamanho_bytes INTEGER NOT NULL,
      extensao TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      indexed_json TEXT NOT NULL,
      duplicate_doc_id INTEGER,
      similarity REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureCorePermissions(database);

  try {
    if (hasTable(database, 'permissoes') && hasTable(database, 'role_permissoes')) {
      const allPerms = database.prepare("SELECT id FROM permissoes").all() as { id: number }[];
      const insertRolePerm = database.prepare("INSERT OR IGNORE INTO role_permissoes (role_id, permissao_id) VALUES (?, ?)");
      
      for (const p of allPerms) {
        insertRolePerm.run(1, p.id); // Super Admin
        insertRolePerm.run(2, p.id); // Admin Institucional
      }
      console.log('--- [AUTO-REPARAÇÃO] Permissões administrativas sincronizadas ---');
    }
  } catch (error) {
    console.error('Erro na auto-reparação de permissões:', error);
  }
}

function ensureCorePermissions(database: SqliteDatabase): void {
  if (!hasTable(database, 'permissoes')) return;

  const permissoes = [
    { codigo: 'dig.physical', nome: 'Gerir Fila Fisica de Digitalizacao', grupo: 'Digitalizacao' },
    { codigo: 'users.deactivate', nome: 'Desactivar Utilizadores', grupo: 'Utilizadores' },
    { codigo: 'audit.view', nome: 'Ver Auditoria', grupo: 'Sistema' }
  ];

  const insertPermissao = database.prepare(`
    INSERT OR IGNORE INTO permissoes (codigo, nome, grupo)
    VALUES (?, ?, ?)
  `);
  for (const permissao of permissoes) {
    insertPermissao.run(permissao.codigo, permissao.nome, permissao.grupo);
  }

  if (!hasTable(database, 'role_permissoes')) return;

  const insertRolePermissao = database.prepare(`
    INSERT OR IGNORE INTO role_permissoes (role_id, permissao_id)
    SELECT ?, id FROM permissoes WHERE codigo = ?
  `);

  for (const codigo of ['dig.physical', 'users.deactivate', 'audit.view']) {
    insertRolePermissao.run(1, codigo);
    insertRolePermissao.run(2, codigo);
  }
  insertRolePermissao.run(4, 'dig.physical');
}

export function getDatabase(): SqliteDatabase {
  if (!db) {
    // Garantir que a pasta do banco de dados existe
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      console.log(`Criando diretório do banco de dados: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      db = new Database(DB_PATH, {
        verbose: process.env.LOG_SQL === 'true' ? console.log : undefined
      });
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      ensureSchemaCompatibility(db);
    } catch (error) {
      console.error('Erro ao conectar base de dados:', error);
      throw error;
    }
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
