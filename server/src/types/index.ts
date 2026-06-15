export interface Instituicao {
  id?: number;
  codigo: string;
  nome: string;
  sigla?: string;
  admin_email?: string;
  storage_limit_gb?: number;
  storage_used_bytes?: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: number;
}

export interface Departamento {
  id?: number;
  instituicao_id: number;
  nome: string;
  descricao?: string;
  responsavel?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: number;
}

export interface Role {
  id?: number;
  nome: string;
  descricao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Permissao {
  id?: number;
  codigo: string;
  nome: string;
  descricao?: string;
  grupo: string;
}

export interface Usuario {
  id?: number;
  instituicao_id: number;
  departamento_id?: number;
  nome: string;
  email: string;
  senha_hash?: string;
  cargo?: string;
  role_id: number;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: number;
  // Join fields
  instituicao_nome?: string;
  departamento_nome?: string;
  role_nome?: string;
}

export interface Sessao {
  id?: number;
  usuario_id: number;
  refresh_token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  revoked_at?: string;
  created_at?: string;
}

export interface Pasta {
  id?: number;
  instituicao_id: number;
  departamento_id?: number;
  pasta_pai_id?: number;
  codigo?: string;
  nome: string;
  descricao?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: number;
}

export interface Documento {
  id?: number;
  instituicao_id: number;
  departamento_id?: number;
  pasta_id?: number;
  localizacao_id?: number;
  localizacao_nome?: string;
  localizacao_caminho?: string;
  numero_caixa?: string;
  condicao?: 'GOOD' | 'FAIR' | 'DETERIORATED';
  titulo: string;
  tipo?: string;
  suporte?: 'DIGITAL' | 'FISICO' | 'AMBOS';
  classificacao?: 'PUBLICO' | 'RESTRITO' | 'CONFIDENCIAL' | 'SECRETO';
  data_documento?: string;
  anos_retencao?: number;
  notas?: string;
  created_by: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: number;
}

export interface Ficheiro {
  id?: number;
  documento_id: number;
  nome_interno: string;
  nome_original: string;
  tipo_mime?: string;
  tamanho_bytes?: number;
  versao?: number;
  hash_sha256?: string;
  created_at?: string;
  created_by: number;
}

export interface LocalizacaoFisica {
  id?: number;
  instituicao_id: number;
  parent_id?: number;
  tipo: 'EDIFICIO' | 'SALA' | 'ESTANTE' | 'PRATELEIRA' | 'CAIXA';
  nome: string;
  codigo_barras?: string;
  capacidade_caixas?: number;
  ocupacao_atual?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  deleted_by?: number;
}

export interface DocumentoLocalizacao {
  documento_id: number;
  localizacao_id: number;
  numero_caixa?: string;
  condicao?: 'GOOD' | 'FAIR' | 'DETERIORATED';
  notas_condicao?: string;
  updated_at?: string;
}

export interface Emprestimo {
  id?: number;
  instituicao_id: number;
  documento_id: number;
  requisitante_id: number;
  aprovado_por?: number;
  data_pedido?: string;
  data_prevista_devolucao: string;
  data_devolucao_real?: string;
  motivo?: string;
  estado?: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'DEVOLVIDO';
  condicao_devolucao?: string;
  notas_devolucao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FilaDigitalizacao {
  id?: number;
  instituicao_id: number;
  documento_id: number;
  tipo_fila?: 'DIGITAL' | 'FISICA';
  localizacao_id?: number;
  localizacao_nome?: string;
  numero_caixa?: string;
  condicao?: 'GOOD' | 'FAIR' | 'DETERIORATED';
  prioridade?: 'URGENT' | 'NORMAL' | 'LOW';
  estado?: 'PENDENTE' | 'EM_CURSO' | 'CONCLUIDO';
  solicitado_por: number;
  operador_id?: number;
  data_solicitacao?: string;
  data_inicio?: string;
  data_conclusao?: string;
  ocr_texto?: string;
  notas?: string;
}

export interface Auditoria {
  id?: number;
  instituicao_id: number;
  usuario_id?: number;
  acao: string;
  entidade: string;
  entidade_id?: number;
  detalhes?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface Notificacao {
  id?: number;
  usuario_id: number;
  titulo: string;
  mensagem: string;
  tipo?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  lida?: boolean;
  created_at?: string;
}

export interface Relatorio {
  id?: number;
  instituicao_id: number;
  usuario_id: number;
  tipo: string;
  estado?: 'GERANDO' | 'CONCLUIDO' | 'ERRO';
  caminho_ficheiro?: string;
  parametros?: string;
  created_at?: string;
}
