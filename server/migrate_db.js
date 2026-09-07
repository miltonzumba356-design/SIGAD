const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database/sigad.db');
const db = new Database(dbPath);

console.log('Iniciando migração da base de dados...');

function addColumn(table, column, type) {
  try {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`✓ Coluna "${column}" adicionada à tabela "${table}"`);
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log(`! A coluna "${column}" já existe na tabela "${table}".`);
    } else {
      console.error(`✗ Erro ao adicionar "${column}" a "${table}":`, error.message);
    }
  }
}

// Corrigir tabela pastas
addColumn('pastas', 'codigo', 'VARCHAR(50)');
addColumn('pastas', 'departamento_id', 'INTEGER');

// Corrigir tabela documentos
addColumn('documentos', 'departamento_id', 'INTEGER');

console.log('Migração concluída.');
db.close();
