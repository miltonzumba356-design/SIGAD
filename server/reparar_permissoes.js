const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'database', 'sigad.db'));

try {
  console.log('Iniciando reparação de permissões...');

  // 1. Obter todas as permissões cadastradas
  const allPerms = db.prepare("SELECT id, codigo FROM permissoes").all();
  
  // 2. Limpar e Reinserir permissões para Super Admin (Role 1)
  const insertPerm = db.prepare("INSERT OR IGNORE INTO role_permissoes (role_id, permissao_id) VALUES (?, ?)");
  
  db.transaction(() => {
    for (const p of allPerms) {
      // Super Admin (1) ganha TUDO
      insertPerm.run(1, p.id);
      
      // Admin Institucional (2) ganha quase tudo, exceto gestão global de instituições se preferires
      // Mas para o teu teste, vamos dar quase tudo também
      if (!p.codigo.startsWith('sys.')) {
        insertPerm.run(2, p.id);
      }
    }
    
    // Garantir que o Admin Institucional (2) possa ver/gerir a sua própria instituição
    const sysInst = allPerms.find(p => p.codigo === 'sys.institutions');
    if (sysInst) insertPerm.run(2, sysInst.id);
  })();

  console.log('Permissões reparadas com sucesso!');
  
  // 3. Verificar o usuário miltonzumba356@gmail.com
  const user = db.prepare("SELECT * FROM usuarios WHERE email = ?").get('miltonzumba356@gmail.com');
  if (user) {
    console.log(`Usuário Milton encontrado. Role ID: ${user.role_id}`);
    if (user.role_id !== 1) {
      db.prepare("UPDATE usuarios SET role_id = 1 WHERE id = ?").run(user.id);
      console.log('Role do Milton atualizado para Super Admin (1)');
    }
  }

} catch (error) {
  console.error('Erro na reparação:', error);
} finally {
  db.close();
}
