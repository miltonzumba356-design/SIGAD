const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

async function createSuperAdmin() {
  const dbPath = path.join(__dirname, 'database/sigad.db');
  const db = new Database(dbPath);

  try {
    const senhaHash = await bcrypt.hash('admin123', 10);
    
    // 1. Verificar ID do Super Admin Role
    const role = db.prepare("SELECT id FROM roles WHERE nome = 'Super Admin'").get();
    if (!role) {
      console.error('Perfil Super Admin não encontrado. Executa npm run seed primeiro.');
      return;
    }

    // 2. Verificar ID da Instituição (usaremos a primeira disponível)
    const inst = db.prepare("SELECT id FROM instituicoes LIMIT 1").get();
    if (!inst) {
      console.error('Nenhuma instituição encontrada. Executa npm run seed primeiro.');
      return;
    }

    // 3. Criar o Super Admin
    const insert = db.prepare(`
      INSERT OR REPLACE INTO usuarios (instituicao_id, nome, email, senha_hash, cargo, role_id, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      inst.id,
      'Super Administrador',
      'superadmin@sigad.gov.ao',
      senhaHash,
      'Administrador Global',
      role.id,
      1
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ Super Admin criado com sucesso!');
    console.log('  Email: superadmin@sigad.gov.ao');
    console.log('  Senha: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('Erro ao criar Super Admin:', error.message);
  } finally {
    db.close();
  }
}

createSuperAdmin();
