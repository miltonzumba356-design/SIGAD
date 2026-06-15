const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database/sigad.db');
const db = new Database(dbPath);

const email = 'superadmin@sigad.gov.ao';
const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  SIGAD - Diagnóstico de Utilizador');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (!user) {
  console.log('✗ Utilizador "' + email + '" não encontrado.');
} else {
  console.log('✓ Utilizador encontrado:');
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Ativo:', user.ativo === 1 ? 'SIM' : 'NÃO');
  console.log('  Role ID:', user.role_id);
  
  // Testar a senha manualmente
  const senhaCorreta = bcrypt.compareSync('admin123', user.senha_hash);
  console.log('  Senha "admin123" é válida?', senhaCorreta ? 'SIM' : 'NÃO');
  
  if (user.deleted_at) {
    console.log('  AVISO: O utilizador está marcado como ELIMINADO (deleted_at).');
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
db.close();
