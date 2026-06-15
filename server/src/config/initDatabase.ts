import { getDatabase } from './database';

const db = getDatabase();

const schema = `
-- 1. Instituições
CREATE TABLE IF NOT EXISTS instituicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  sigla VARCHAR(50),
  admin_email VARCHAR(255),
  storage_limit_gb INTEGER DEFAULT 10,
  storage_used_bytes INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deleted_by INTEGER
);

-- 2. Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  responsavel VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deleted_by INTEGER,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id)
);

-- 3. Perfis e Permissões
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo VARCHAR(100) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  grupo VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissoes (
  role_id INTEGER NOT NULL,
  permissao_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permissao_id),
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permissao_id) REFERENCES permissoes(id)
);

-- 4. Utilizadores
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  departamento_id INTEGER,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  cargo VARCHAR(100),
  role_id INTEGER NOT NULL,
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deleted_by INTEGER,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 5. Sessões e Segurança
CREATE TABLE IF NOT EXISTS sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 6. Estrutura Documental (Pastas e Documentos)
CREATE TABLE IF NOT EXISTS pastas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  departamento_id INTEGER,
  pasta_pai_id INTEGER,
  codigo VARCHAR(50),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deleted_by INTEGER,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
  FOREIGN KEY (pasta_pai_id) REFERENCES pastas(id)
);

CREATE TABLE IF NOT EXISTS documentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  departamento_id INTEGER,
  pasta_id INTEGER,
  titulo VARCHAR(500) NOT NULL,
  tipo VARCHAR(100), -- Ex: Oficio, Contrato
  suporte VARCHAR(20) DEFAULT 'DIGITAL', -- DIGITAL, FISICO, AMBOS
  classificacao VARCHAR(50) DEFAULT 'PUBLICO', -- PUBLICO, RESTRITO, CONFIDENCIAL, SECRETO
  data_documento DATE,
  anos_retencao INTEGER DEFAULT 5,
  notas TEXT,
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deleted_by INTEGER,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
  FOREIGN KEY (pasta_id) REFERENCES pastas(id),
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

-- 7. Ficheiros Digitais e Versões
CREATE TABLE IF NOT EXISTS ficheiros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  documento_id INTEGER NOT NULL,
  nome_interno VARCHAR(500) NOT NULL, -- Nome UUID no storage
  nome_original VARCHAR(500) NOT NULL,
  tipo_mime VARCHAR(100),
  tamanho_bytes INTEGER,
  versao INTEGER DEFAULT 1,
  hash_sha256 VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER NOT NULL,
  FOREIGN KEY (documento_id) REFERENCES documentos(id),
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

-- 8. Arquivo Físico
CREATE TABLE IF NOT EXISTS localizacoes_fisicas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  parent_id INTEGER,
  tipo VARCHAR(50) NOT NULL, -- EDIFICIO, SALA, ESTANTE, PRATELEIRA, CAIXA
  nome VARCHAR(255) NOT NULL,
  codigo_barras VARCHAR(100),
  capacidade_caixas INTEGER,
  ocupacao_atual INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  deleted_by INTEGER,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (parent_id) REFERENCES localizacoes_fisicas(id)
);

CREATE TABLE IF NOT EXISTS documentos_localizacao (
  documento_id INTEGER PRIMARY KEY,
  localizacao_id INTEGER NOT NULL,
  numero_caixa VARCHAR(100),
  condicao VARCHAR(50) DEFAULT 'GOOD', -- GOOD, FAIR, DETERIORATED
  notas_condicao TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (documento_id) REFERENCES documentos(id),
  FOREIGN KEY (localizacao_id) REFERENCES localizacoes_fisicas(id)
);

-- 9. Empréstimos
CREATE TABLE IF NOT EXISTS emprestimos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  documento_id INTEGER NOT NULL,
  requisitante_id INTEGER NOT NULL,
  aprovado_por INTEGER,
  data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_prevista_devolucao DATE NOT NULL,
  data_devolucao_real DATETIME,
  motivo TEXT,
  estado VARCHAR(50) DEFAULT 'PENDENTE', -- PENDENTE, APROVADO, REJEITADO, DEVOLVIDO
  condicao_devolucao VARCHAR(50),
  notas_devolucao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (documento_id) REFERENCES documentos(id),
  FOREIGN KEY (requisitante_id) REFERENCES usuarios(id),
  FOREIGN KEY (aprovado_por) REFERENCES usuarios(id)
);

-- 10. Digitalização e OCR
CREATE TABLE IF NOT EXISTS fila_digitalizacao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  documento_id INTEGER NOT NULL,
  tipo_fila VARCHAR(20) DEFAULT 'DIGITAL', -- DIGITAL, FISICA
  localizacao_id INTEGER,
  numero_caixa VARCHAR(100),
  condicao VARCHAR(50),
  prioridade VARCHAR(20) DEFAULT 'NORMAL', -- URGENT, NORMAL, LOW
  estado VARCHAR(50) DEFAULT 'PENDENTE', -- PENDENTE, EM_CURSO, CONCLUIDO
  solicitado_por INTEGER NOT NULL,
  operador_id INTEGER,
  data_solicitacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_inicio DATETIME,
  data_conclusao DATETIME,
  ocr_texto TEXT,
  notas TEXT,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (documento_id) REFERENCES documentos(id),
  FOREIGN KEY (localizacao_id) REFERENCES localizacoes_fisicas(id),
  FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
  FOREIGN KEY (operador_id) REFERENCES usuarios(id)
);

-- 11. Auditoria e Relatórios
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

CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  usuario_id INTEGER,
  acao VARCHAR(100) NOT NULL,
  entidade VARCHAR(100) NOT NULL,
  entidade_id INTEGER,
  detalhes TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'INFO',
  lida BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS relatorios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instituicao_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  estado VARCHAR(50) DEFAULT 'GERANDO', -- GERANDO, CONCLUIDO, ERRO
  caminho_ficheiro VARCHAR(500),
  parametros TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- 12. Índices para Performance e Segurança
CREATE INDEX IF NOT EXISTS idx_instituicoes_codigo ON instituicoes(codigo);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_documentos_instituicao ON documentos(instituicao_id);
CREATE INDEX IF NOT EXISTS idx_documentos_deleted ON documentos(deleted_at);
CREATE INDEX IF NOT EXISTS idx_auditoria_instituicao ON auditoria(instituicao_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes(refresh_token);
`;

try {
  // Desativa constraints temporariamente para o setup
  db.pragma('foreign_keys = OFF');
  
  // Executa o schema
  db.exec(schema);
  
  // Reativa constraints
  db.pragma('foreign_keys = ON');
  
  console.log('✓ Base de dados inicializada com sucesso (v1.0.0)');
} catch (error) {
  console.error('✗ Erro ao inicializar base de dados:', error);
  process.exit(1);
}
