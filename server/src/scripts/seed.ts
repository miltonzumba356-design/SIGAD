import { getDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  SIGAD - Iniciando Seed de Dados (v1.0.0)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const db = getDatabase();

    // 1. Limpar dados existentes (Opcional - cuidado em produção)
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM role_permissoes');
    db.exec('DELETE FROM permissoes');
    db.exec('DELETE FROM sessoes');
    db.exec('DELETE FROM usuarios');
    db.exec('DELETE FROM roles');
    db.exec('DELETE FROM departamentos');
    db.exec('DELETE FROM instituicoes');
    db.exec('PRAGMA foreign_keys = ON');

    // 2. Criar Permissões
    console.log('-> Criando permissões...');
    const permissoes = [
      { codigo: 'users.view', nome: 'Ver Utilizadores', grupo: 'Utilizadores' },
      { codigo: 'users.create', nome: 'Criar Utilizadores', grupo: 'Utilizadores' },
      { codigo: 'users.edit', nome: 'Editar Utilizadores', grupo: 'Utilizadores' },
      { codigo: 'users.delete', nome: 'Eliminar Utilizadores', grupo: 'Utilizadores' },
      { codigo: 'users.perms', nome: 'Gerir Permissões', grupo: 'Utilizadores' },
      { codigo: 'docs.view', nome: 'Ver Documentos', grupo: 'Documentos' },
      { codigo: 'docs.upload', nome: 'Upload Documentos', grupo: 'Documentos' },
      { codigo: 'docs.edit', nome: 'Editar Documentos', grupo: 'Documentos' },
      { codigo: 'docs.delete', nome: 'Eliminar Documentos', grupo: 'Documentos' },
      { codigo: 'docs.confidential', nome: 'Acesso Confidencial', grupo: 'Documentos' },
      { codigo: 'docs.secret', nome: 'Acesso Secreto', grupo: 'Documentos' },
      { codigo: 'loans.view', nome: 'Ver Empréstimos', grupo: 'Empréstimos' },
      { codigo: 'loans.request', nome: 'Solicitar Empréstimos', grupo: 'Empréstimos' },
      { codigo: 'loans.approve', nome: 'Aprovar Empréstimos', grupo: 'Empréstimos' },
      { codigo: 'loans.return', nome: 'Registar Devoluções', grupo: 'Empréstimos' },
      { codigo: 'dig.view', nome: 'Ver Fila Digitalização', grupo: 'Digitalização' },
      { codigo: 'dig.do', nome: 'Realizar Digitalização', grupo: 'Digitalização' },
      { codigo: 'dig.ocr', nome: 'Gerir OCR', grupo: 'Digitalização' },
      { codigo: 'rep.view', nome: 'Ver Relatórios', grupo: 'Relatórios' },
      { codigo: 'rep.generate', nome: 'Gerar Relatórios', grupo: 'Relatórios' },
      { codigo: 'rep.audit', nome: 'Ver Auditoria', grupo: 'Sistema' },
      { codigo: 'sys.config', nome: 'Configuração Sistema', grupo: 'Sistema' },
      { codigo: 'sys.trash', nome: 'Gerir Reciclagem', grupo: 'Sistema' },
      { codigo: 'sys.institutions', nome: 'Gerir Instituições', grupo: 'Sistema' },
    ];

    const insertPerm = db.prepare('INSERT INTO permissoes (codigo, nome, grupo) VALUES (?, ?, ?)');
    for (const p of permissoes) {
      insertPerm.run(p.codigo, p.nome, p.grupo);
    }

    // 3. Criar Perfis (Roles)
    console.log('-> Criando perfis...');
    const roles = [
      { nome: 'Super Admin', descricao: 'Administrador total do sistema' },
      { nome: 'Admin Institucional', descricao: 'Administrador da instituição' },
      { nome: 'Arquivista', descricao: 'Gestor de documentos e arquivo físico' },
      { nome: 'Digitalizador', descricao: 'Operador de digitalização e OCR' },
      { nome: 'Utilizador Padrão', descricao: 'Consulta e upload de documentos básicos' },
      { nome: 'Requisitante', descricao: 'Apenas consulta e solicitação de empréstimos' },
    ];

    const insertRole = db.prepare('INSERT INTO roles (nome, descricao) VALUES (?, ?)');
    for (const r of roles) {
      insertRole.run(r.nome, r.descricao);
    }

    // 4. Associar Permissões aos Perfis
    console.log('-> Associando permissões aos perfis...');
    const allPerms = db.prepare('SELECT id, codigo FROM permissoes').all() as any[];
    const allRoles = db.prepare('SELECT id, nome FROM roles').all() as any[];

    const insertRolePerm = db.prepare('INSERT INTO role_permissoes (role_id, permissao_id) VALUES (?, ?)');

    // Super Admin - Todas as permissões
    const superAdminRole = allRoles.find(r => r.nome === 'Super Admin');
    for (const p of allPerms) {
      insertRolePerm.run(superAdminRole.id, p.id);
    }

    // Admin Institucional - Quase todas menos sys.institutions
    const adminInstRole = allRoles.find(r => r.nome === 'Admin Institucional');
    for (const p of allPerms) {
      if (p.codigo !== 'sys.institutions') {
        insertRolePerm.run(adminInstRole.id, p.id);
      }
    }

    // Arquivista
    const arquivistaRole = allRoles.find(r => r.nome === 'Arquivista');
    const arquivistaPerms = ['docs.view', 'docs.upload', 'docs.edit', 'docs.delete', 'loans.view', 'loans.approve', 'loans.return'];
    for (const p of allPerms) {
      if (arquivistaPerms.includes(p.codigo)) {
        insertRolePerm.run(arquivistaRole.id, p.id);
      }
    }

    // 5. Criar Instituição de Teste
    console.log('-> Criando instituição de teste...');
    const insertInst = db.prepare(`
      INSERT INTO instituicoes (codigo, nome, sigla, admin_email, storage_limit_gb)
      VALUES (?, ?, ?, ?, ?)
    `);
    const instResult = insertInst.run('MINPLAN', 'Ministério do Planeamento', 'MINPLAN', 'admin@minplan.gov.ao', 50);
    const instId = instResult.lastInsertRowid;

    // 6. Criar Departamento de Teste
    console.log('-> Criando departamento de teste...');
    const insertDept = db.prepare('INSERT INTO departamentos (instituicao_id, nome, descricao) VALUES (?, ?, ?)');
    const deptResult = insertDept.run(instId, 'Arquivo Central', 'Gestão documental centralizada');
    const deptId = deptResult.lastInsertRowid;

    // 7. Criar Usuários de Teste
    console.log('-> Criando usuários de teste...');
    const senhaHash = await bcrypt.hash('admin123', 10);
    const insertUser = db.prepare(`
      INSERT INTO usuarios (instituicao_id, departamento_id, nome, email, senha_hash, cargo, role_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Admin
    insertUser.run(instId, deptId, 'Admin SIGAD', 'admin@minplan.gov.ao', senhaHash, 'Administrador de Sistemas', adminInstRole.id);
    
    // Arquivista
    insertUser.run(instId, deptId, 'Maria Arquivista', 'maria@minplan.gov.ao', senhaHash, 'Arquivista Sênior', arquivistaRole.id);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ Seed concluído com sucesso!');
    console.log('  Email: admin@minplan.gov.ao');
    console.log('  Senha: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error: any) {
    console.error('✗ Erro ao executar seed:', error.message);
    process.exit(1);
  }
}

seed();
