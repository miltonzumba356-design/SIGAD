# SIGAD - Referencia Completa de Rotas

Documentacao detalhada de todos os endpoints da API SIGAD.

Base URL: `http://localhost:3000/api`

## Indice

- [Autenticacao](#autenticacao)
- [Usuarios](#usuarios)
- [Instituicoes](#instituicoes)
- [Pastas](#pastas)
- [Documentos](#documentos)
- [Emprestimos](#emprestimos)
- [Digitalizacao](#digitalizacao)

---

## Autenticacao

Base: `/api/auth`

### Login
```http
POST /api/auth/login
```

Autentica usuario e retorna token JWT.

**Body:**
```json
{
  "email": "admin@minplan.gov.ao",
  "senha": "admin123"
}
```

**Resposta Sucesso (200):**
```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": 1,
    "nome": "Administrador Sistema",
    "email": "admin@minplan.gov.ao",
    "instituicao_id": 1,
    "nivel_acesso": "ADMINISTRADOR"
  }
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

Registra logout (auditoria).

### Usuario Atual
```http
GET /api/auth/me
Authorization: Bearer {token}
```

Retorna dados do usuario autenticado.

### Alterar Senha
```http
POST /api/auth/alterar-senha
Authorization: Bearer {token}
```

**Body:**
```json
{
  "senha_atual": "admin123",
  "senha_nova": "novaSenha456"
}
```

---

## Usuarios

Base: `/api/usuarios`

Todas as rotas requerem autenticacao.

### Criar Usuario
```http
POST /api/usuarios
Authorization: Bearer {token}
Permissao: ADMINISTRADOR
```

**Body:**
```json
{
  "instituicao_id": 1,
  "nome": "Joao Silva",
  "email": "joao@example.com",
  "senha": "senha123",
  "cargo": "Arquivista",
  "departamento": "Arquivo Central",
  "nivel_acesso": "BASICO"
}
```

**Niveis de Acesso:**
- `BASICO` - Usuario comum
- `MODERADOR` - Moderador
- `ADMINISTRADOR` - Administrador total

### Listar Usuarios
```http
GET /api/usuarios?instituicao_id=1&ativo=true
Authorization: Bearer {token}
Permissao: MODERADOR ou ADMINISTRADOR
```

### Buscar Usuario
```http
GET /api/usuarios/:id
Authorization: Bearer {token}
```

### Atualizar Usuario
```http
PUT /api/usuarios/:id
Authorization: Bearer {token}
```

**Body (campos opcionais):**
```json
{
  "nome": "Novo Nome",
  "cargo": "Novo Cargo",
  "nivel_acesso": "MODERADOR"
}
```

### Desativar Usuario
```http
DELETE /api/usuarios/:id
Authorization: Bearer {token}
Permissao: ADMINISTRADOR
```

---

## Instituicoes

Base: `/api/instituicoes`

### Criar Instituicao
```http
POST /api/instituicoes
Authorization: Bearer {token}
Permissao: ADMINISTRADOR
```

**Body:**
```json
{
  "codigo": "MINPLAN",
  "nome": "Ministerio do Planeamento",
  "sigla": "MINPLAN",
  "ativo": true
}
```

### Listar Instituicoes
```http
GET /api/instituicoes?ativas=true
Authorization: Bearer {token}
```

### Buscar Instituicao
```http
GET /api/instituicoes/:id
Authorization: Bearer {token}
```

### Atualizar Instituicao
```http
PUT /api/instituicoes/:id
Authorization: Bearer {token}
Permissao: ADMINISTRADOR
```

### Desativar Instituicao
```http
DELETE /api/instituicoes/:id
Authorization: Bearer {token}
Permissao: ADMINISTRADOR
```

---

## Pastas

Base: `/api/pastas`

Estrutura hierarquica para organizacao de documentos.

### Criar Pasta
```http
POST /api/pastas
Authorization: Bearer {token}
```

**Body:**
```json
{
  "instituicao_id": 1,
  "pasta_pai_id": null,
  "codigo": "001",
  "nome": "Documentos Administrativos",
  "descricao": "Pasta raiz para documentos administrativos",
  "nivel_confidencialidade_id": 1
}
```

**Nota:** `pasta_pai_id = null` cria pasta raiz. Com ID cria subpasta.

### Listar Pastas
```http
GET /api/pastas?instituicao_id=1&raiz=true
Authorization: Bearer {token}
```

**Query Params:**
- `instituicao_id` (obrigatorio) - ID da instituicao
- `raiz` (opcional) - `true` para listar apenas pastas raiz

### Buscar Pasta
```http
GET /api/pastas/:id
Authorization: Bearer {token}
```

### Listar Subpastas
```http
GET /api/pastas/:id/subpastas
Authorization: Bearer {token}
```

### Atualizar Pasta
```http
PUT /api/pastas/:id
Authorization: Bearer {token}
```

### Excluir Pasta
```http
DELETE /api/pastas/:id
Authorization: Bearer {token}
```

**Restricoes:**
- Nao pode ter subpastas
- Nao pode ter documentos

---

## Documentos

Base: `/api/documentos`

### Criar Documento
```http
POST /api/documentos
Authorization: Bearer {token}
```

**Body:**
```json
{
  "instituicao_id": 1,
  "pasta_id": 2,
  "tipo_documento_id": 1,
  "codigo_referencia": "OF-2026-001",
  "titulo": "Oficio sobre Orcamento",
  "descricao": "Documento referente ao OGE 2026",
  "data_documento": "2026-01-15",
  "autor": "Ministerio das Financas",
  "nivel_confidencialidade_id": 1,
  "localizacao_fisica": "Arquivo Central - Estante A",
  "formato": "FISICO",
  "digitalizado": false,
  "created_by": 1
}
```

**Formatos:**
- `FISICO` - Apenas fisico
- `DIGITAL` - Apenas digital
- `HIBRIDO` - Fisico + digital

**Tipos de Documento (IDs padrao):**
1. Oficio
2. Despacho
3. Contrato
4. Relatorio
5. Ata
6. Decreto
7. Portaria

**Niveis de Confidencialidade (IDs padrao):**
1. Publico
2. Restrito
3. Confidencial
4. Secreto

### Listar Documentos
```http
GET /api/documentos?instituicao_id=1&pasta_id=2&busca=orcamento&digitalizado=false
Authorization: Bearer {token}
```

**Query Params:**
- `instituicao_id` (obrigatorio) - ID da instituicao
- `pasta_id` (opcional) - Filtrar por pasta
- `tipo_documento_id` (opcional) - Filtrar por tipo
- `nivel_confidencialidade_id` (opcional) - Filtrar por nivel
- `digitalizado` (opcional) - `true` ou `false`
- `busca` (opcional) - Texto para buscar em titulo, codigo ou descricao

### Buscar Documento
```http
GET /api/documentos/:id
Authorization: Bearer {token}
```

### Atualizar Documento
```http
PUT /api/documentos/:id
Authorization: Bearer {token}
```

**Body (campos opcionais):**
```json
{
  "titulo": "Novo Titulo",
  "descricao": "Nova descricao",
  "digitalizado": true,
  "caminho_digital": "/uploads/OF-2026-001.pdf",
  "observacoes": "Digitalizado em 2026-05-11"
}
```

### Excluir Documento
```http
DELETE /api/documentos/:id
Authorization: Bearer {token}
```

### Estatisticas
```http
GET /api/documentos/instituicao/:instituicao_id/estatisticas
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "sucesso": true,
  "estatisticas": {
    "total": 1234,
    "digitalizados": 856,
    "fisicos": 378,
    "porTipo": [
      { "nome": "Oficio", "count": 456 },
      { "nome": "Despacho", "count": 234 }
    ],
    "porNivel": [
      { "nome": "Publico", "count": 1000 },
      { "nome": "Confidencial", "count": 234 }
    ]
  }
}
```

---

## Emprestimos

Base: `/api/emprestimos`

Gestao de emprestimos de documentos fisicos.

### Criar Emprestimo
```http
POST /api/emprestimos
Authorization: Bearer {token}
```

**Body:**
```json
{
  "documento_id": 5,
  "usuario_id": 2,
  "data_devolucao_prevista": "2026-05-25",
  "motivo": "Consulta para relatorio mensal",
  "observacoes": "Documento fragil",
  "aprovado_por": 1
}
```

### Listar Ativos
```http
GET /api/emprestimos?instituicao_id=1
Authorization: Bearer {token}
```

### Listar Atrasados
```http
GET /api/emprestimos/atrasados?instituicao_id=1
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "sucesso": true,
  "total": 3,
  "emprestimos": [
    {
      "id": 5,
      "codigo_referencia": "CON-2025-089",
      "documento_titulo": "Contrato...",
      "usuario_nome": "Carlos Mendes",
      "email": "carlos@example.com",
      "data_devolucao_prevista": "2026-05-01",
      "dias_atraso": 10
    }
  ]
}
```

### Estatisticas
```http
GET /api/emprestimos/estatisticas?instituicao_id=1
Authorization: Bearer {token}
```

### Buscar Emprestimo
```http
GET /api/emprestimos/:id
Authorization: Bearer {token}
```

### Registrar Devolucao
```http
PUT /api/emprestimos/:id/devolucao
Authorization: Bearer {token}
```

**Body (opcional):**
```json
{
  "observacoes": "Documento devolvido em bom estado"
}
```

### Historico por Documento
```http
GET /api/emprestimos/documento/:documento_id/historico
Authorization: Bearer {token}
```

---

## Digitalizacao

Base: `/api/digitalizacao`

Gestao de fila de digitalizacao de documentos fisicos.

### Adicionar a Fila
```http
POST /api/digitalizacao
Authorization: Bearer {token}
```

**Body:**
```json
{
  "documento_id": 5,
  "prioridade": "NORMAL",
  "solicitado_por": 1,
  "observacoes": "Urgente para relatorio"
}
```

**Prioridades:**
- `URGENTE` - Processado primeiro
- `ALTA` - Prioridade alta
- `NORMAL` - Prioridade padrao
- `BAIXA` - Processado por ultimo

### Listar Fila
```http
GET /api/digitalizacao?instituicao_id=1
Authorization: Bearer {token}
```

### Estatisticas
```http
GET /api/digitalizacao/estatisticas?instituicao_id=1
Authorization: Bearer {token}
```

### Buscar Item
```http
GET /api/digitalizacao/:id
Authorization: Bearer {token}
```

### Iniciar Digitalizacao
```http
PUT /api/digitalizacao/:id/iniciar
Authorization: Bearer {token}
```

**Body:**
```json
{
  "operador_id": 5
}
```

### Concluir Digitalizacao
```http
PUT /api/digitalizacao/:id/concluir
Authorization: Bearer {token}
```

**Body (opcional):**
```json
{
  "caminho_digital": "/uploads/documentos/OF-2026-001.pdf"
}
```

### Cancelar
```http
PUT /api/digitalizacao/:id/cancelar
Authorization: Bearer {token}
```

---

## Codigos de Status HTTP

- `200 OK` - Sucesso
- `201 Created` - Criado com sucesso
- `400 Bad Request` - Dados invalidos
- `401 Unauthorized` - Nao autenticado
- `403 Forbidden` - Sem permissao
- `404 Not Found` - Nao encontrado
- `500 Internal Server Error` - Erro no servidor

---

## Autenticacao

Todas as rotas (exceto `/api/auth/login`) requerem autenticacao via JWT.

**Header:**
```
Authorization: Bearer {seu_token_jwt}
```

**Token expira em:** 8 horas

---

## Formato de Respostas

### Sucesso
```json
{
  "sucesso": true,
  "mensagem": "Operacao realizada com sucesso",
  "dados": { ... }
}
```

### Erro
```json
{
  "sucesso": false,
  "mensagem": "Descricao do erro",
  "erro": "Detalhes tecnicos (apenas em dev)"
}
```

---

## Auditoria

Todas as operacoes de criacao, atualizacao e exclusao sao registradas automaticamente na tabela `auditoria` com:
- Usuario que executou
- Acao realizada
- Entidade afetada
- Detalhes da operacao
- IP do cliente
- Timestamp

---

## Exemplos Completos com cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@minplan.gov.ao","senha":"admin123"}'
```

### Criar Documento
```bash
curl -X POST http://localhost:3000/api/documentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "instituicao_id": 1,
    "pasta_id": 2,
    "tipo_documento_id": 1,
    "codigo_referencia": "OF-2026-999",
    "titulo": "Teste de Documento",
    "nivel_confidencialidade_id": 1,
    "created_by": 1
  }'
```

### Listar Emprestimos Atrasados
```bash
curl -X GET "http://localhost:3000/api/emprestimos/atrasados?instituicao_id=1" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Registrar Devolucao
```bash
curl -X PUT http://localhost:3000/api/emprestimos/1/devolucao \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"observacoes":"Devolvido em bom estado"}'
```
