# Referencia da API - SIGAD

Base URL: `http://localhost:3000/api`

## Formato de Respostas

Todas as respostas seguem este formato:

### Sucesso
```json
{
  "sucesso": true,
  "mensagem": "Descricao da operacao",
  "dados": { ... }
}
```

### Erro
```json
{
  "sucesso": false,
  "mensagem": "Descricao do erro",
  "erro": "Detalhes tecnicos (apenas em desenvolvimento)"
}
```

## Endpoints

### Sistema

#### Verificar Saude
```http
GET /health
```

Resposta:
```json
{
  "status": "ok",
  "mensagem": "SIGAD API funcionando"
}
```

---

## Instituicoes

### Criar Instituicao
```http
POST /instituicoes
```

Body:
```json
{
  "codigo": "MINPLAN",
  "nome": "Ministerio do Planeamento",
  "sigla": "MINPLAN",
  "ativo": true
}
```

Resposta:
```json
{
  "sucesso": true,
  "mensagem": "Instituicao criada com sucesso",
  "id": 1
}
```

### Listar Instituicoes
```http
GET /instituicoes?ativas=true
```

Query Parameters:
- `ativas` (opcional): `true` ou `false` - Filtrar apenas instituicoes ativas

Resposta:
```json
{
  "sucesso": true,
  "total": 1,
  "instituicoes": [
    {
      "id": 1,
      "codigo": "MINPLAN",
      "nome": "Ministerio do Planeamento",
      "sigla": "MINPLAN",
      "ativo": 1,
      "created_at": "2026-05-11 10:00:00"
    }
  ]
}
```

### Buscar Instituicao
```http
GET /instituicoes/:id
```

### Atualizar Instituicao
```http
PUT /instituicoes/:id
```

Body (todos os campos opcionais):
```json
{
  "nome": "Novo Nome",
  "sigla": "NN",
  "ativo": false
}
```

### Desativar Instituicao
```http
DELETE /instituicoes/:id
```

---

## Documentos

### Criar Documento
```http
POST /documentos
```

Body:
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
  "created_by": 1
}
```

Campos obrigatorios:
- `instituicao_id`
- `pasta_id`
- `codigo_referencia`
- `titulo`
- `nivel_confidencialidade_id`
- `created_by`

### Listar Documentos
```http
GET /documentos?instituicao_id=1
```

Query Parameters:
- `instituicao_id` (obrigatorio): ID da instituicao
- `pasta_id` (opcional): Filtrar por pasta
- `tipo_documento_id` (opcional): Filtrar por tipo
- `nivel_confidencialidade_id` (opcional): Filtrar por nivel
- `digitalizado` (opcional): `true` ou `false`
- `busca` (opcional): Texto para buscar em titulo, codigo ou descricao

### Buscar Documento
```http
GET /documentos/:id
```

### Atualizar Documento
```http
PUT /documentos/:id
```

Body (campos opcionais):
```json
{
  "titulo": "Novo Titulo",
  "descricao": "Nova descricao",
  "digitalizado": true,
  "observacoes": "Documento digitalizado em 2026-05-11"
}
```

### Excluir Documento
```http
DELETE /documentos/:id
```

### Estatisticas de Documentos
```http
GET /documentos/instituicao/:instituicao_id/estatisticas
```

Resposta:
```json
{
  "sucesso": true,
  "estatisticas": {
    "total": 150,
    "digitalizados": 75,
    "fisicos": 75,
    "porTipo": [
      { "nome": "Oficio", "count": 50 },
      { "nome": "Despacho", "count": 30 }
    ],
    "porNivel": [
      { "nome": "Publico", "count": 100 },
      { "nome": "Confidencial", "count": 50 }
    ]
  }
}
```

---

## Emprestimos

### Registar Emprestimo
```http
POST /emprestimos
```

Body:
```json
{
  "documento_id": 1,
  "usuario_id": 1,
  "data_devolucao_prevista": "2026-05-25",
  "motivo": "Consulta para relatorio",
  "aprovado_por": 1
}
```

### Listar Emprestimos Ativos
```http
GET /emprestimos?instituicao_id=1
```

Query Parameters:
- `instituicao_id` (opcional): Filtrar por instituicao

### Listar Emprestimos Atrasados
```http
GET /emprestimos/atrasados?instituicao_id=1
```

Resposta:
```json
{
  "sucesso": true,
  "total": 2,
  "emprestimos": [
    {
      "id": 1,
      "codigo_referencia": "OF-2026-001",
      "documento_titulo": "Oficio sobre Orcamento",
      "usuario_nome": "Joao Silva",
      "email": "joao@example.com",
      "departamento": "Financas",
      "data_devolucao_prevista": "2026-05-01",
      "dias_atraso": 10
    }
  ]
}
```

### Buscar Emprestimo
```http
GET /emprestimos/:id
```

### Registar Devolucao
```http
PUT /emprestimos/:id/devolucao
```

Body (opcional):
```json
{
  "observacoes": "Documento devolvido em bom estado"
}
```

### Historico de Emprestimos de Documento
```http
GET /emprestimos/documento/:documento_id/historico
```

### Estatisticas de Emprestimos
```http
GET /emprestimos/estatisticas?instituicao_id=1
```

Resposta:
```json
{
  "sucesso": true,
  "estatisticas": {
    "total": 100,
    "ativos": 15,
    "atrasados": 3,
    "devolvidos": 85
  }
}
```

---

## Niveis de Confidencialidade

IDs padrao:
1. Publico
2. Restrito
3. Confidencial
4. Secreto

## Tipos de Documento

IDs padrao:
1. Oficio
2. Despacho
3. Contrato
4. Relatorio
5. Ata
6. Decreto
7. Portaria

---

## Codigos de Status HTTP

- `200 OK`: Operacao bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `400 Bad Request`: Dados invalidos
- `404 Not Found`: Recurso nao encontrado
- `500 Internal Server Error`: Erro no servidor

---

## Exemplos com cURL

### Criar Documento
```bash
curl -X POST http://localhost:3000/api/documentos \
  -H "Content-Type: application/json" \
  -d '{
    "instituicao_id": 1,
    "pasta_id": 2,
    "tipo_documento_id": 1,
    "codigo_referencia": "OF-2026-002",
    "titulo": "Oficio Teste",
    "nivel_confidencialidade_id": 1,
    "created_by": 1
  }'
```

### Buscar Documentos com Filtros
```bash
curl "http://localhost:3000/api/documentos?instituicao_id=1&busca=orcamento&digitalizado=false"
```

### Registar Emprestimo
```bash
curl -X POST http://localhost:3000/api/emprestimos \
  -H "Content-Type: application/json" \
  -d '{
    "documento_id": 1,
    "usuario_id": 1,
    "data_devolucao_prevista": "2026-06-01",
    "motivo": "Analise de conteudo"
  }'
```

### Registar Devolucao
```bash
curl -X PUT http://localhost:3000/api/emprestimos/1/devolucao \
  -H "Content-Type: application/json" \
  -d '{
    "observacoes": "Devolvido sem observacoes"
  }'
```
