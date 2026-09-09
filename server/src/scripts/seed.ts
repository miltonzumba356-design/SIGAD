import { getDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  SIGAD - Iniciando Seed de Dados (v3.0.0 - MINTRANS)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const db = getDatabase();

    // 1. Limpar dados existentes (cuidado em produção)
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('DELETE FROM autorizacoes_download');
    db.exec('DELETE FROM emprestimos');
    db.exec('DELETE FROM search_index');
    db.exec('DELETE FROM digitalizacoes_pendentes');
    db.exec('DELETE FROM notificacoes');
    db.exec('DELETE FROM relatorios');
    db.exec('DELETE FROM auditoria');
    db.exec('DELETE FROM documentos_localizacao');
    db.exec('DELETE FROM fila_digitalizacao');
    db.exec('DELETE FROM ficheiros');
    db.exec('DELETE FROM documentos');
    db.exec('DELETE FROM localizacoes_fisicas');
    db.exec('DELETE FROM pastas');
    db.exec('DELETE FROM role_permissoes');
    db.exec('DELETE FROM permissoes');
    db.exec('DELETE FROM sessoes');
    db.exec('DELETE FROM usuarios');
    db.exec('DELETE FROM roles');
    db.exec('DELETE FROM departamentos');
    db.exec('DELETE FROM instituicoes');
    // Reinicia todos os contadores AUTOINCREMENT: sem isto, IDs (ex: role_id de
    // "Super Admin") vão "andando" a cada reseed e quebram verificações de
    // admin espalhadas pelo sistema que assumem role_id 1/2 estáveis.
    db.exec('DELETE FROM sqlite_sequence');
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
      { nome: 'Arquivista', descricao: 'Gestor de documentos e arquivo físico, com acesso à auditoria' },
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
    const roleIdByName: Record<string, number> = {};
    for (const r of allRoles) roleIdByName[r.nome] = r.id;

    const insertRolePerm = db.prepare('INSERT INTO role_permissoes (role_id, permissao_id) VALUES (?, ?)');
    const permIdByCodigo: Record<string, number> = {};
    for (const p of allPerms) permIdByCodigo[p.codigo] = p.id;

    const grantRole = (roleName: string, codigos: string[]) => {
      const roleId = roleIdByName[roleName];
      for (const codigo of codigos) {
        const permId = permIdByCodigo[codigo];
        if (permId) insertRolePerm.run(roleId, permId);
      }
    };

    // Super Admin - todas as permissões
    grantRole('Super Admin', allPerms.map(p => p.codigo));

    // Admin Institucional - quase todas, exceto gestão de instituições
    grantRole('Admin Institucional', allPerms.map(p => p.codigo).filter(c => c !== 'sys.institutions'));

    // Arquivista - inclui acesso à auditoria (apoia o Gabinete de Auditoria Interna)
    grantRole('Arquivista', [
      'docs.view', 'docs.upload', 'docs.edit', 'docs.delete', 'docs.confidential',
      'loans.view', 'loans.approve', 'loans.return',
      'dig.view', 'rep.view', 'rep.audit'
    ]);

    // Digitalizador
    grantRole('Digitalizador', ['docs.view', 'docs.upload', 'dig.view', 'dig.do', 'dig.ocr']);

    // Utilizador Padrão
    grantRole('Utilizador Padrão', ['docs.view', 'docs.upload', 'docs.edit', 'loans.view', 'loans.request']);

    // Requisitante
    grantRole('Requisitante', ['docs.view', 'loans.view', 'loans.request']);

    // 5. Instituição - Ministério dos Transportes de Angola
    console.log('-> Criando instituição MINTRANS...');
    const insertInst = db.prepare(`
      INSERT INTO instituicoes (codigo, nome, sigla, admin_email, storage_limit_gb)
      VALUES (?, ?, ?, ?, ?)
    `);
    const instResult = insertInst.run('MINTRANS', 'Ministério dos Transportes', 'MINTRANS', 'admin@mintrans.gov.ao', 100);
    const instId = instResult.lastInsertRowid as number;

    // 6. Departamentos — organograma oficial do MINTRANS
    console.log('-> Criando departamentos (organograma oficial)...');
    const insertDept = db.prepare('INSERT INTO departamentos (instituicao_id, nome, descricao, responsavel) VALUES (?, ?, ?, ?)');
    const deptDefs = [
      // Órgãos Centrais de Direcção Superior / Serviços de Apoio Instrumental
      { key: 'gabinete', nome: 'Gabinete do Ministro', descricao: 'Apoio instrumental direto ao Ministro; correspondência e despachos ministeriais', responsavel: 'Domingos Van-Dúnem' },
      { key: 'sett', nome: 'Gabinete do Secretário de Estado para os Transportes Terrestres', descricao: 'Apoio instrumental ao Secretário de Estado para os Transportes Terrestres', responsavel: 'Fernanda Muteka' },
      { key: 'seacmp', nome: 'Gabinete do Secretário de Estado para os Sectores da Aviação Civil, Marítimo e Portuário', descricao: 'Apoio instrumental ao Secretário de Estado para a Aviação Civil e os sectores Marítimo e Portuário', responsavel: 'Pedro Capalandanda' },
      // Serviços de Apoio Técnico
      { key: 'secretaria', nome: 'Secretaria Geral', descricao: 'Gestão documental centralizada, expediente geral e arquivo corrente/morto', responsavel: 'Maria Kiala' },
      { key: 'rh', nome: 'Gabinete de Recursos Humanos', descricao: 'Gestão de pessoal, formação e administração de recursos humanos', responsavel: 'Rosa Chiquenda' },
      { key: 'dnpee', nome: 'Gabinete de Estudos, Planeamento e Estatística', descricao: 'Planeamento estratégico, estudos técnicos e estatísticas do setor', responsavel: 'Manuel Zau' },
      { key: 'juridico', nome: 'Gabinete Jurídico e de Intercâmbio', descricao: 'Assessoria jurídica, contencioso e cooperação/intercâmbio institucional', responsavel: 'Teresa Kalunga' },
      { key: 'ti', nome: 'Gabinete de Tecnologias de Informação, Comunicação Institucional e Imprensa', descricao: 'Sistemas de informação, comunicação institucional e imprensa', responsavel: 'Admin SIGAD' },
      { key: 'auditoria', nome: 'Gabinete de Auditoria Interna', descricao: 'Auditoria interna aos processos e serviços do Ministério', responsavel: 'Anselmo Bumba' },
      // Serviço Executivo Directo
      { key: 'concessoes', nome: 'Direcção Nacional para a Economia das Concessões', descricao: 'Gestão económica e contratual das concessões do setor dos transportes', responsavel: 'Eduardo Sumbo' },
    ];
    const deptIds: Record<string, number> = {};
    for (const d of deptDefs) {
      const r = insertDept.run(instId, d.nome, d.descricao, d.responsavel);
      deptIds[d.key] = r.lastInsertRowid as number;
    }

    // 7. Utilizadores
    console.log('-> Criando utilizadores...');
    const senhaHash = await bcrypt.hash('admin123', 10);
    const insertUser = db.prepare(`
      INSERT INTO usuarios (instituicao_id, departamento_id, nome, email, senha_hash, cargo, role_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const userDefs = [
      { key: 'admin', dept: 'ti', nome: 'Admin SIGAD', email: 'admin@mintrans.gov.ao', cargo: 'Administrador de Sistemas', role: 'Super Admin' },
      { key: 'domingos', dept: 'gabinete', nome: 'Domingos Van-Dúnem', email: 'domingos.vandunem@mintrans.gov.ao', cargo: 'Chefe de Gabinete do Ministro', role: 'Admin Institucional' },
      { key: 'maria', dept: 'secretaria', nome: 'Maria Kiala', email: 'maria.kiala@mintrans.gov.ao', cargo: 'Arquivista-Chefe', role: 'Arquivista' },
      { key: 'joao', dept: 'secretaria', nome: 'João Sacaia', email: 'joao.sacaia@mintrans.gov.ao', cargo: 'Técnico de Digitalização', role: 'Digitalizador' },
      { key: 'fernanda', dept: 'sett', nome: 'Fernanda Muteka', email: 'fernanda.muteka@mintrans.gov.ao', cargo: 'Técnica Superior de Transportes Terrestres', role: 'Utilizador Padrão' },
      { key: 'pedro', dept: 'seacmp', nome: 'Pedro Capalandanda', email: 'pedro.capalandanda@mintrans.gov.ao', cargo: 'Técnico Superior de Transportes Marítimos e Portuários', role: 'Utilizador Padrão' },
      { key: 'isabel', dept: 'seacmp', nome: 'Isabel Necaca', email: 'isabel.necaca@mintrans.gov.ao', cargo: 'Técnica de Aviação Civil', role: 'Requisitante' },
      { key: 'manuel', dept: 'dnpee', nome: 'Manuel Zau', email: 'manuel.zau@mintrans.gov.ao', cargo: 'Técnico de Planeamento e Estatística', role: 'Utilizador Padrão' },
      { key: 'teresa', dept: 'juridico', nome: 'Teresa Kalunga', email: 'teresa.kalunga@mintrans.gov.ao', cargo: 'Jurista', role: 'Requisitante' },
      { key: 'rosa', dept: 'rh', nome: 'Rosa Chiquenda', email: 'rosa.chiquenda@mintrans.gov.ao', cargo: 'Técnica de Recursos Humanos', role: 'Utilizador Padrão' },
      { key: 'anselmo', dept: 'auditoria', nome: 'Anselmo Bumba', email: 'anselmo.bumba@mintrans.gov.ao', cargo: 'Auditor Interno', role: 'Arquivista' },
      { key: 'eduardo', dept: 'concessoes', nome: 'Eduardo Sumbo', email: 'eduardo.sumbo@mintrans.gov.ao', cargo: 'Técnico Superior de Concessões', role: 'Utilizador Padrão' },
    ];
    const userIds: Record<string, number> = {};
    for (const u of userDefs) {
      const r = insertUser.run(instId, deptIds[u.dept], u.nome, u.email, senhaHash, u.cargo, roleIdByName[u.role]);
      userIds[u.key] = r.lastInsertRowid as number;
    }

    // 8. Pastas (arquivo digital) — espelha o organograma: Apoio Instrumental / Apoio Técnico / Executivo Directo
    console.log('-> Criando pastas digitais (espelhando o organograma)...');
    const insertPasta = db.prepare(`
      INSERT INTO pastas (instituicao_id, departamento_id, pasta_pai_id, codigo, nome, descricao)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const pastaDefs = [
      // Serviços de Apoio Instrumental
      { key: 'apoio_instrumental', dept: 'gabinete', pai: null as string | null, codigo: 'SAI', nome: 'Serviços de Apoio Instrumental', descricao: 'Gabinete do Ministro e Gabinetes dos Secretários de Estado' },
      { key: 'gabinete', dept: 'gabinete', pai: 'apoio_instrumental', codigo: 'GM', nome: 'Gabinete do Ministro', descricao: 'Correspondência e expediente do Gabinete do Ministro' },
      { key: 'despachos', dept: 'gabinete', pai: 'gabinete', codigo: 'GM-DESP', nome: 'Despachos Ministeriais', descricao: 'Despachos e decisões assinadas pelo Ministro' },
      { key: 'sett', dept: 'sett', pai: 'apoio_instrumental', codigo: 'SETT', nome: 'Gabinete do Secretário de Estado para os Transportes Terrestres', descricao: 'Processos e correspondência dos Transportes Terrestres' },
      { key: 'sett_lic', dept: 'sett', pai: 'sett', codigo: 'SETT-LIC', nome: 'Licenciamento de Transportadoras Rodoviárias', descricao: 'Processos de licenciamento de operadores rodoviários' },
      { key: 'seacmp', dept: 'seacmp', pai: 'apoio_instrumental', codigo: 'SEACMP', nome: 'Gabinete do Secretário de Estado para os Sectores da Aviação Civil, Marítimo e Portuário', descricao: 'Processos e correspondência da Aviação Civil e dos sectores Marítimo e Portuário' },
      { key: 'seacmp_aviacao', dept: 'seacmp', pai: 'seacmp', codigo: 'SEACMP-AC', nome: 'Aviação Civil', descricao: 'Processos e correspondência de Aviação Civil' },
      { key: 'seacmp_maritimo', dept: 'seacmp', pai: 'seacmp', codigo: 'SEACMP-MP', nome: 'Marítimo e Portuário', descricao: 'Processos e correspondência dos sectores Marítimo e Portuário' },
      // Serviços de Apoio Técnico
      { key: 'apoio_tecnico', dept: 'secretaria', pai: null, codigo: 'SAT', nome: 'Serviços de Apoio Técnico', descricao: 'Secretaria Geral e Gabinetes de apoio técnico do Ministério' },
      { key: 'secretaria', dept: 'secretaria', pai: 'apoio_tecnico', codigo: 'SG', nome: 'Secretaria Geral', descricao: 'Expediente geral e arquivo corrente institucional' },
      { key: 'arquivo', dept: 'secretaria', pai: 'secretaria', codigo: 'SG-AC', nome: 'Arquivo Corrente', descricao: 'Arquivo corrente institucional' },
      { key: 'rh', dept: 'rh', pai: 'apoio_tecnico', codigo: 'RH', nome: 'Gabinete de Recursos Humanos', descricao: 'Processos e correspondência de recursos humanos' },
      { key: 'dnpee', dept: 'dnpee', pai: 'apoio_tecnico', codigo: 'GEPE', nome: 'Gabinete de Estudos, Planeamento e Estatística', descricao: 'Estudos, planos e boletins estatísticos do setor' },
      { key: 'juridico', dept: 'juridico', pai: 'apoio_tecnico', codigo: 'GJI', nome: 'Gabinete Jurídico e de Intercâmbio', descricao: 'Pareceres, contencioso e correspondência jurídica' },
      { key: 'ti', dept: 'ti', pai: 'apoio_tecnico', codigo: 'TI', nome: 'Gabinete de Tecnologias de Informação, Comunicação Institucional e Imprensa', descricao: 'Sistemas de informação, comunicação institucional e imprensa' },
      { key: 'auditoria', dept: 'auditoria', pai: 'apoio_tecnico', codigo: 'AI', nome: 'Gabinete de Auditoria Interna', descricao: 'Relatórios e processos de auditoria interna' },
      // Serviço Executivo Directo
      { key: 'executivo_directo', dept: 'concessoes', pai: null, codigo: 'SED', nome: 'Serviço Executivo Directo', descricao: 'Direcção Nacional para a Economia das Concessões' },
      { key: 'concessoes', dept: 'concessoes', pai: 'executivo_directo', codigo: 'DNEC', nome: 'Direcção Nacional para a Economia das Concessões', descricao: 'Processos e contratos de concessão do setor dos transportes' },
    ];
    const pastaIds: Record<string, number> = {};
    for (const p of pastaDefs) {
      const paiId = p.pai ? pastaIds[p.pai] : null;
      const r = insertPasta.run(instId, deptIds[p.dept], paiId, p.codigo, p.nome, p.descricao);
      pastaIds[p.key] = r.lastInsertRowid as number;
    }

    // 9. Localizações físicas (Arquivo Físico)
    console.log('-> Criando localizações físicas...');
    const insertLoc = db.prepare(`
      INSERT INTO localizacoes_fisicas (instituicao_id, parent_id, tipo, nome, codigo_barras, capacidade_caixas)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const locDefs = [
      { key: 'edificio', pai: null as string | null, tipo: 'EDIFICIO', nome: 'Edifício Sede do MINTRANS', codigo_barras: 'MINTRANS-ED01', capacidade: null as number | null },
      { key: 'sala_corrente', pai: 'edificio', tipo: 'SALA', nome: 'Sala de Arquivo Corrente - Piso 1', codigo_barras: 'MINTRANS-S01', capacidade: null },
      { key: 'estante_a', pai: 'sala_corrente', tipo: 'ESTANTE', nome: 'Estante A', codigo_barras: 'MINTRANS-EA', capacidade: 40 },
      { key: 'prateleira_a1', pai: 'estante_a', tipo: 'PRATELEIRA', nome: 'Prateleira A1', codigo_barras: 'MINTRANS-EA-P1', capacidade: 10 },
      { key: 'sala_morto', pai: 'edificio', tipo: 'SALA', nome: 'Depósito de Arquivo Morto - Piso 0', codigo_barras: 'MINTRANS-S02', capacidade: null },
      { key: 'estante_d', pai: 'sala_morto', tipo: 'ESTANTE', nome: 'Estante D', codigo_barras: 'MINTRANS-ED', capacidade: 60 },
    ];
    const locIds: Record<string, number> = {};
    for (const l of locDefs) {
      const paiId = l.pai ? locIds[l.pai] : null;
      const r = insertLoc.run(instId, paiId, l.tipo, l.nome, l.codigo_barras, l.capacidade);
      locIds[l.key] = r.lastInsertRowid as number;
    }

    // 10. Documentos
    console.log('-> Criando documentos...');
    const insertDoc = db.prepare(`
      INSERT INTO documentos (instituicao_id, departamento_id, pasta_id, titulo, tipo, suporte, classificacao, data_documento, anos_retencao, notas, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDocLoc = db.prepare(`
      INSERT INTO documentos_localizacao (documento_id, localizacao_id, numero_caixa, condicao, notas_condicao)
      VALUES (?, ?, ?, ?, ?)
    `);

    const retencaoPorClassificacao: Record<string, number> = {
      PUBLICO: 5,
      RESTRITO: 10,
      CONFIDENCIAL: 15,
      SECRETO: 20,
    };

    type DocDef = {
      key?: string;
      titulo: string;
      tipo: string;
      suporte: 'DIGITAL' | 'FISICO' | 'AMBOS';
      classificacao: 'PUBLICO' | 'RESTRITO' | 'CONFIDENCIAL' | 'SECRETO';
      data: string;
      dept: string;
      pasta: string | null;
      criadoPor: string;
      notas: string;
      anosRetencao?: number;
      local?: { key: string; caixa: string; condicao: 'GOOD' | 'FAIR' | 'DETERIORATED' };
    };

    const docDefs: DocDef[] = [
      { titulo: 'Ofício n.º 12/GM/2025 – Convite para Cimeira da SADC sobre Transportes', tipo: 'Ofício', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-02-10', dept: 'gabinete', pasta: 'gabinete', criadoPor: 'domingos', notas: 'Convite dirigido ao Ministro para participação na Cimeira da SADC sobre Transportes e Logística.' },
      { titulo: 'Despacho Ministerial n.º 034/2025 – Aprovação do Plano Diretor de Transportes 2025-2030', tipo: 'Despacho Ministerial', suporte: 'AMBOS', classificacao: 'PUBLICO', data: '2025-03-05', dept: 'gabinete', pasta: 'despachos', criadoPor: 'domingos', notas: 'Despacho que aprova o Plano Diretor de Transportes para o quinquénio 2025-2030.', local: { key: 'prateleira_a1', caixa: 'CX-01', condicao: 'GOOD' } },
      { titulo: 'Despacho Ministerial n.º 041/2025 – Nomeação do Diretor Nacional de Transportes Terrestres', tipo: 'Despacho Ministerial', suporte: 'FISICO', classificacao: 'RESTRITO', data: '2025-04-18', dept: 'gabinete', pasta: null, criadoPor: 'domingos', notas: 'Nomeação do novo Diretor Nacional sob tutela do Secretário de Estado para os Transportes Terrestres.', local: { key: 'prateleira_a1', caixa: 'CX-02', condicao: 'GOOD' } },
      { titulo: 'Nota Interna n.º 07/GM/2025 – Orientações sobre regime de teletrabalho', tipo: 'Nota Interna', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-01-20', dept: 'gabinete', pasta: 'gabinete', criadoPor: 'domingos', notas: 'Orientações internas sobre o regime de teletrabalho no Ministério.' },
      { key: 'lic_kassai', titulo: 'Processo de Licenciamento n.º 118/SETT/2025 – Kassai Expresso, Lda', tipo: 'Processo de Licenciamento', suporte: 'AMBOS', classificacao: 'PUBLICO', data: '2025-05-12', dept: 'sett', pasta: 'sett_lic', criadoPor: 'fernanda', notas: 'Pedido de licenciamento de transportadora rodoviária interprovincial.', local: { key: 'estante_d', caixa: 'CX-05', condicao: 'FAIR' } },
      { key: 'rel_en100', titulo: 'Relatório de Fiscalização n.º 22/SETT/2025 – Fiscalização rodoviária na EN-100 (Luanda-Caxito)', tipo: 'Relatório de Fiscalização', suporte: 'DIGITAL', classificacao: 'RESTRITO', data: '2025-06-02', dept: 'sett', pasta: 'sett', criadoPor: 'fernanda', notas: 'Relatório de ação de fiscalização a operadores de transporte coletivo.' },
      { key: 'lic_tcul', titulo: 'Licença de Operação n.º 305/SETT/2025 – TCUL, Transportes Colectivos Urbanos de Luanda', tipo: 'Licença de Operação', suporte: 'AMBOS', classificacao: 'PUBLICO', data: '2025-06-20', dept: 'sett', pasta: 'sett', criadoPor: 'fernanda', notas: 'Renovação de licença de operação de transporte urbano coletivo.', local: { key: 'prateleira_a1', caixa: 'CX-03', condicao: 'GOOD' } },
      { titulo: 'Ata de Reunião n.º 15/SETT/2025 – Coordenação com operadoras de táxi', tipo: 'Ata de Reunião', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-07-15', dept: 'sett', pasta: 'sett', criadoPor: 'fernanda', notas: 'Ata da reunião de coordenação com associações de operadores de táxi.' },
      { titulo: 'Ofício n.º 88/SEACMP/2025 – Pedido de dados de tráfego ao Porto de Luanda', tipo: 'Ofício', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-02-25', dept: 'seacmp', pasta: 'seacmp_maritimo', criadoPor: 'pedro', notas: 'Pedido de dados estatísticos de movimento de cargas e navios.' },
      { titulo: 'Processo de Licenciamento n.º 09/SEACMP/2025 – Agência de navegação Mar Azul, Lda', tipo: 'Processo de Licenciamento', suporte: 'AMBOS', classificacao: 'PUBLICO', data: '2025-03-30', dept: 'seacmp', pasta: 'seacmp_maritimo', criadoPor: 'pedro', notas: 'Processo de licenciamento de agência de navegação marítima.', local: { key: 'estante_d', caixa: 'CX-07', condicao: 'FAIR' } },
      { key: 'rel_lobito', titulo: 'Relatório de Fiscalização n.º 05/SEACMP/2025 – Inspeção às instalações do Porto do Lobito', tipo: 'Relatório de Fiscalização', suporte: 'FISICO', classificacao: 'RESTRITO', data: '2025-04-22', dept: 'seacmp', pasta: null, criadoPor: 'pedro', notas: 'Relatório de inspeção técnica às instalações portuárias do Lobito.', local: { key: 'estante_d', caixa: 'CX-08', condicao: 'DETERIORATED' } },
      { titulo: 'Parecer Técnico n.º 11/SEACMP/2025 – Ampliação do cais do Porto do Namibe', tipo: 'Parecer Técnico', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-05-08', dept: 'seacmp', pasta: 'seacmp_maritimo', criadoPor: 'pedro', notas: 'Parecer técnico sobre o projeto de ampliação do cais comercial.' },
      { titulo: 'Ofício n.º 33/SEACMP/2025 – Coordenação com a ENANA-EP sobre o Aeroporto Internacional Dr. António Agostinho Neto', tipo: 'Ofício', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-01-15', dept: 'seacmp', pasta: 'seacmp_aviacao', criadoPor: 'isabel', notas: 'Coordenação operacional com a ENANA-EP sobre o novo aeroporto internacional.' },
      { key: 'lic_taag', titulo: 'Licença de Operação n.º 06/SEACMP/2025 – Rota doméstica da TAAG – Linhas Aéreas de Angola', tipo: 'Licença de Operação', suporte: 'AMBOS', classificacao: 'PUBLICO', data: '2025-03-11', dept: 'seacmp', pasta: 'seacmp_aviacao', criadoPor: 'isabel', notas: 'Autorização de nova rota doméstica para a transportadora aérea nacional.', local: { key: 'estante_d', caixa: 'CX-09', condicao: 'GOOD' } },
      { key: 'rel_auditoria_seguranca', titulo: 'Relatório de Fiscalização n.º 03/SEACMP/2025 – Auditoria de segurança operacional a operador privado', tipo: 'Relatório de Fiscalização', suporte: 'FISICO', classificacao: 'SECRETO', data: '2025-06-28', dept: 'seacmp', pasta: null, criadoPor: 'isabel', notas: 'Auditoria de segurança operacional com informação sensível de voo.', local: { key: 'estante_d', caixa: 'CX-10', condicao: 'GOOD' } },
      { titulo: 'Nota Interna n.º 04/SEACMP/2025 – Procedimentos de resposta a incidentes aeroportuários', tipo: 'Nota Interna', suporte: 'DIGITAL', classificacao: 'RESTRITO', data: '2025-07-02', dept: 'seacmp', pasta: 'seacmp_aviacao', criadoPor: 'isabel', notas: 'Procedimentos internos de resposta a incidentes em aeroportos nacionais.' },
      { key: 'boletim', titulo: 'Boletim Estatístico dos Transportes – 1.º Trimestre de 2025', tipo: 'Boletim Estatístico', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-04-30', dept: 'dnpee', pasta: 'dnpee', criadoPor: 'manuel', notas: 'Compilação de indicadores estatísticos do setor dos transportes.' },
      { titulo: 'Estudo de Viabilidade do Corredor Ferroviário Lobito–Luau', tipo: 'Estudo de Viabilidade', suporte: 'AMBOS', classificacao: 'PUBLICO', data: '2025-05-20', dept: 'dnpee', pasta: 'dnpee', criadoPor: 'manuel', notas: 'Estudo técnico de viabilidade para modernização do corredor ferroviário.', local: { key: 'estante_d', caixa: 'CX-11', condicao: 'FAIR' } },
      { titulo: 'Parecer Técnico n.º 02/GEPE/2025 – Revisão do Plano Diretor de Transportes 2025-2030', tipo: 'Parecer Técnico', suporte: 'DIGITAL', classificacao: 'RESTRITO', data: '2025-06-14', dept: 'dnpee', pasta: 'dnpee', criadoPor: 'manuel', notas: 'Parecer técnico de revisão intercalar do Plano Diretor de Transportes.' },
      { titulo: 'Parecer Técnico n.º 18/GJI/2025 – Contencioso sobre suspensão de licença de transportadora', tipo: 'Parecer Técnico', suporte: 'DIGITAL', classificacao: 'CONFIDENCIAL', data: '2025-05-02', dept: 'juridico', pasta: 'juridico', criadoPor: 'teresa', notas: 'Parecer jurídico sobre processo de suspensão de licença de operador.' },
      { key: 'notificacao_judicial', titulo: 'Correspondência Externa n.º 41/GJI/2025 – Notificação judicial, Processo n.º 224/2025', tipo: 'Correspondência Externa', suporte: 'FISICO', classificacao: 'RESTRITO', data: '2025-07-25', dept: 'juridico', pasta: null, criadoPor: 'teresa', notas: 'Notificação judicial recebida no âmbito de processo em tribunal.', local: { key: 'prateleira_a1', caixa: 'CX-12', condicao: 'GOOD' } },
      { titulo: 'Ata de Reunião n.º 03/GJI/2025 – Reunião com a Procuradoria-Geral da República sobre regulamentação', tipo: 'Ata de Reunião', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-08-01', dept: 'juridico', pasta: 'juridico', criadoPor: 'teresa', notas: 'Ata de reunião de trabalho sobre regulamentação do setor dos transportes.' },
      { titulo: 'Ofício Circular n.º 03/SG/2025 – Normas de Expediente e Arquivo Corrente', tipo: 'Ofício', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-01-10', dept: 'secretaria', pasta: 'secretaria', criadoPor: 'maria', notas: 'Circular com normas internas de expediente geral e organização do arquivo corrente.' },
      { titulo: 'Ata de Reunião n.º 01/SG/2025 – Reunião de Coordenação de Secretariado', tipo: 'Ata de Reunião', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-02-05', dept: 'secretaria', pasta: 'arquivo', criadoPor: 'joao', notas: 'Ata de reunião de coordenação entre a Secretaria Geral e os gabinetes do Ministério.' },
      { titulo: 'Ofício n.º 14/RH/2025 – Convocatória para Concurso Público de Ingresso', tipo: 'Ofício', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-02-18', dept: 'rh', pasta: 'rh', criadoPor: 'rosa', notas: 'Convocatória para concurso público de ingresso na função pública do Ministério.' },
      { titulo: 'Nota Interna n.º 09/RH/2025 – Plano de Formação Profissional 2025', tipo: 'Nota Interna', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-03-22', dept: 'rh', pasta: 'rh', criadoPor: 'rosa', notas: 'Plano anual de formação e capacitação profissional dos quadros do Ministério.' },
      { titulo: 'Ofício n.º 05/TI/2025 – Plano de Modernização do Sistema de Gestão Documental (SIGAD)', tipo: 'Ofício', suporte: 'DIGITAL', classificacao: 'PUBLICO', data: '2025-04-02', dept: 'ti', pasta: 'ti', criadoPor: 'admin', notas: 'Proposta de modernização e expansão do sistema de gestão documental.' },
      { titulo: 'Relatório de Auditoria Interna n.º 01/2025 – Auditoria aos Processos de Licenciamento', tipo: 'Relatório de Auditoria Interna', suporte: 'DIGITAL', classificacao: 'RESTRITO', data: '2025-06-10', dept: 'auditoria', pasta: 'auditoria', criadoPor: 'anselmo', notas: 'Auditoria interna aos processos de licenciamento de transportadoras rodoviárias.' },
      { key: 'rel_auditoria_arquivo', titulo: 'Relatório de Auditoria Interna n.º 02/2025 – Auditoria à Gestão de Arquivo Físico', tipo: 'Relatório de Auditoria Interna', suporte: 'FISICO', classificacao: 'CONFIDENCIAL', data: '2025-08-15', dept: 'auditoria', pasta: null, criadoPor: 'anselmo', notas: 'Auditoria interna à gestão e conservação do arquivo físico institucional.', anosRetencao: 15, local: { key: 'estante_d', caixa: 'CX-13', condicao: 'GOOD' } },
      { key: 'contrato_zango', titulo: 'Contrato de Concessão n.º 04/DNEC/2025 – Exploração do terminal rodoviário do Zango', tipo: 'Contrato de Concessão', suporte: 'FISICO', classificacao: 'CONFIDENCIAL', data: '2025-07-01', dept: 'concessoes', pasta: null, criadoPor: 'eduardo', notas: 'Contrato de concessão para exploração e gestão do terminal rodoviário.', anosRetencao: 20, local: { key: 'estante_d', caixa: 'CX-06', condicao: 'GOOD' } },
      { key: 'contrato_sonangol', titulo: 'Contrato de Concessão n.º 02/DNEC/2025 – Concessão portuária com a Sonangol Terminais Marítimos', tipo: 'Contrato de Concessão', suporte: 'AMBOS', classificacao: 'CONFIDENCIAL', data: '2025-08-10', dept: 'concessoes', pasta: 'concessoes', criadoPor: 'eduardo', notas: 'Contrato de concessão de exploração de terminal marítimo.', anosRetencao: 20, local: { key: 'prateleira_a1', caixa: 'CX-04', condicao: 'GOOD' } },
      { titulo: 'Processo de Concessão n.º 01/DNEC/2025 – Avaliação de proposta de concessão do Corredor Logístico do Lobito', tipo: 'Processo de Concessão', suporte: 'DIGITAL', classificacao: 'RESTRITO', data: '2025-09-01', dept: 'concessoes', pasta: 'concessoes', criadoPor: 'eduardo', notas: 'Avaliação técnica e económica de proposta de concessão logístico-ferroviária.' },
    ];

    const docIds: Record<string, number> = {};
    for (const doc of docDefs) {
      const pastaId = doc.pasta ? pastaIds[doc.pasta] : null;
      const anosRetencao = doc.anosRetencao ?? retencaoPorClassificacao[doc.classificacao];
      const docResult = insertDoc.run(
        instId,
        deptIds[doc.dept],
        pastaId,
        doc.titulo,
        doc.tipo,
        doc.suporte,
        doc.classificacao,
        doc.data,
        anosRetencao,
        doc.notas,
        userIds[doc.criadoPor]
      );
      const docId = docResult.lastInsertRowid as number;

      if (doc.local) {
        insertDocLoc.run(docId, locIds[doc.local.key], doc.local.caixa, doc.local.condicao, null);
      }
      if (doc.key) docIds[doc.key] = docId;
    }

    // 11. Empréstimos — pedidos pendentes, aprovados, rejeitados e devolvidos
    console.log('-> Criando empréstimos...');
    const insertEmprestimo = db.prepare(`
      INSERT INTO emprestimos (
        instituicao_id, documento_id, requisitante_id, aprovado_por,
        data_pedido, data_prevista_devolucao, data_devolucao_real,
        motivo, estado, condicao_devolucao, notas_devolucao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    type LoanDef = {
      doc: string;
      requisitante: string;
      aprovadoPor?: string;
      dataPedido: string;
      dataPrevista: string;
      dataDevolucaoReal?: string;
      motivo: string;
      estado: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'DEVOLVIDO';
      condicaoDevolucao?: 'GOOD' | 'FAIR' | 'DETERIORATED';
      notasDevolucao?: string;
    };

    const loanDefs: LoanDef[] = [
      { doc: 'lic_kassai', requisitante: 'fernanda', aprovadoPor: 'domingos', dataPedido: '2026-08-20', dataPrevista: '2026-09-25', motivo: 'Instrução de recurso apresentado pela transportadora.', estado: 'APROVADO' },
      { doc: 'rel_en100', requisitante: 'fernanda', dataPedido: '2026-09-02', dataPrevista: '2026-09-20', motivo: 'Preparação de relatório de acompanhamento trimestral.', estado: 'PENDENTE' },
      { doc: 'lic_tcul', requisitante: 'pedro', aprovadoPor: 'domingos', dataPedido: '2026-08-15', dataPrevista: '2026-08-29', motivo: 'Consulta para processo de renovação de licença semelhante.', estado: 'REJEITADO', notasDevolucao: 'Documento necessário para fiscalização em curso; pedido indeferido.' },
      { doc: 'rel_lobito', requisitante: 'pedro', aprovadoPor: 'domingos', dataPedido: '2026-07-10', dataPrevista: '2026-07-24', dataDevolucaoReal: '2026-07-22', motivo: 'Elaboração de plano de melhoria das instalações portuárias.', estado: 'DEVOLVIDO', condicaoDevolucao: 'GOOD', notasDevolucao: 'Devolvido em bom estado, dentro do prazo.' },
      { doc: 'lic_taag', requisitante: 'isabel', aprovadoPor: 'domingos', dataPedido: '2026-08-05', dataPrevista: '2026-08-30', motivo: 'Verificação de condições de renovação de rota doméstica.', estado: 'APROVADO' },
      { doc: 'rel_auditoria_seguranca', requisitante: 'isabel', aprovadoPor: 'domingos', dataPedido: '2026-08-28', dataPrevista: '2026-09-11', motivo: 'Análise de recomendações de segurança operacional.', estado: 'REJEITADO', notasDevolucao: 'Classificação SECRETO — acesso restrito, requer autorização direta do Ministro.' },
      { doc: 'boletim', requisitante: 'manuel', dataPedido: '2026-09-05', dataPrevista: '2026-09-19', motivo: 'Atualização de indicadores para relatório setorial.', estado: 'PENDENTE' },
      { doc: 'contrato_zango', requisitante: 'teresa', aprovadoPor: 'domingos', dataPedido: '2026-08-22', dataPrevista: '2026-09-12', motivo: 'Revisão jurídica de cláusulas contratuais.', estado: 'APROVADO' },
      { doc: 'notificacao_judicial', requisitante: 'teresa', aprovadoPor: 'domingos', dataPedido: '2026-06-01', dataPrevista: '2026-06-15', dataDevolucaoReal: '2026-06-20', motivo: 'Instrução de resposta ao processo judicial.', estado: 'DEVOLVIDO', condicaoDevolucao: 'GOOD', notasDevolucao: 'Devolvido com atraso devido a processo judicial em curso.' },
      { doc: 'rel_auditoria_arquivo', requisitante: 'anselmo', aprovadoPor: 'domingos', dataPedido: '2026-08-30', dataPrevista: '2026-09-13', motivo: 'Complemento de análise de auditoria em curso.', estado: 'REJEITADO', notasDevolucao: 'Documento em uso pela equipa de auditoria; pedido indeferido temporariamente.' },
      { doc: 'contrato_sonangol', requisitante: 'eduardo', dataPedido: '2026-09-06', dataPrevista: '2026-09-21', motivo: 'Preparação de adenda contratual.', estado: 'PENDENTE' },
    ];

    for (const loan of loanDefs) {
      insertEmprestimo.run(
        instId,
        docIds[loan.doc],
        userIds[loan.requisitante],
        loan.aprovadoPor ? userIds[loan.aprovadoPor] : null,
        loan.dataPedido,
        loan.dataPrevista,
        loan.dataDevolucaoReal || null,
        loan.motivo,
        loan.estado,
        loan.condicaoDevolucao || null,
        loan.notasDevolucao || null
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✓ Seed concluído com sucesso!');
    console.log(`  Instituição: Ministério dos Transportes (MINTRANS)`);
    console.log(`  Departamentos: ${deptDefs.length} | Utilizadores: ${userDefs.length} | Pastas: ${pastaDefs.length} | Localizações: ${locDefs.length} | Documentos: ${docDefs.length} | Empréstimos: ${loanDefs.length}`);
    console.log('  Email: admin@mintrans.gov.ao');
    console.log('  Senha: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error: any) {
    console.error('✗ Erro ao executar seed:', error.message);
    process.exit(1);
  }
}

seed();
