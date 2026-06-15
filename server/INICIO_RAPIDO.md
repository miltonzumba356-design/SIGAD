# Guia de Inicio Rapido - SIGAD

## Passo 1: Instalar Dependencias

```bash
cd server
npm install
```

## Passo 2: Configurar Ambiente

O ficheiro `.env` ja esta criado com configuracoes padrao. Se necessario, ajuste:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=gere_um_segredo_forte_com_pelo_menos_32_caracteres
DB_PATH=./database/sigad.db
UPLOAD_PATH=./uploads
```

## Passo 3: Inicializar Base de Dados

```bash
npm run init-db
```

Este comando cria:
- Todas as tabelas necessarias
- Indices para performance
- Dados iniciais (niveis de confidencialidade, tipos de documento)

## Passo 4: Popular com Dados de Teste

```bash
npm run seed
```

Isto cria:
- 1 Instituicao (Ministerio do Planeamento)
- 1 Usuario administrador
- 2 Pastas (hierarquicas)
- 1 Documento de exemplo

## Passo 5: Iniciar o Servidor

```bash
npm run dev
```

O servidor estara disponivel em: `http://localhost:3000`

## Passo 6: Testar a API

### Verificar Saude do Sistema
```bash
curl http://localhost:3000/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "mensagem": "SIGAD API funcionando"
}
```

### Listar Instituicoes
```bash
curl http://localhost:3000/api/instituicoes
```

### Listar Documentos
```bash
curl "http://localhost:3000/api/documentos?instituicao_id=1"
```

### Criar Novo Documento

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

### Estatisticas de Documentos

```bash
curl http://localhost:3000/api/documentos/instituicao/1/estatisticas
```

### Registar Emprestimo

```bash
curl -X POST http://localhost:3000/api/emprestimos \
  -H "Content-Type: application/json" \
  -d '{
    "documento_id": 1,
    "usuario_id": 1,
    "data_devolucao_prevista": "2026-05-25",
    "motivo": "Consulta para relatorio",
    "aprovado_por": 1
  }'
```

### Listar Emprestimos Ativos

```bash
curl "http://localhost:3000/api/emprestimos?instituicao_id=1"
```

## Estrutura de Respostas

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
  "erro": "Detalhes tecnicos"
}
```

## Credenciais de Teste

Apos executar o seed:
- **Email**: admin@minplan.gov.ao
- **Senha**: admin123

## Proximos Passos

1. Explorar os endpoints da API
2. Testar criacao de documentos e emprestimos
3. Verificar relatorios e estatisticas
4. Desenvolver o frontend (React)

## Problemas Comuns

### Porta 3000 ja em uso
Altere a porta no ficheiro `.env`:
```env
PORT=3001
```

### Erro de permissoes na base de dados
Certifique-se que a pasta `database/` tem permissoes de escrita:
```bash
mkdir -p database
chmod 755 database
```

### Modulos nao encontrados
Reinstale as dependencias:
```bash
rm -rf node_modules
npm install
```

## Ferramentas Recomendadas

- **Postman** ou **Insomnia**: Para testar API
- **DB Browser for SQLite**: Para visualizar a base de dados
- **VS Code**: Com extensoes TypeScript e SQLite

## Suporte

Para duvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte a documentacao em `ARQUITETURA.md`
3. Revise os exemplos em `README.md`
