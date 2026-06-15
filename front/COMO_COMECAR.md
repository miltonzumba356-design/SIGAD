# Como Comecar - Guia de Inicio Rapido

Este guia ajuda a iniciar o SIGAD do zero.

## Pre-requisitos

- Node.js 18 ou superior
- pnpm ou npm
- Terminal

## Passo a Passo

### 1. Configurar o Backend

```bash
cd server
```

**Instalar dependencias:**
```bash
npm install
```

**Configurar ambiente:**
```bash
cp .env.example .env
```

O ficheiro `.env` ja tem valores padrao. Ajuste se necessario:
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=gere_um_segredo_forte_com_pelo_menos_32_caracteres
DB_PATH=./database/sigad.db
UPLOAD_PATH=./uploads
```

**Inicializar base de dados:**
```bash
npm run init-db
```

Isto cria:
- Todas as tabelas SQLite
- Indices para performance
- Dados iniciais (niveis de confidencialidade, tipos de documento)

**Popular com dados de teste:**
```bash
npm run seed
```

Isto adiciona:
- 1 Instituicao: Ministerio do Planeamento
- 1 Usuario administrador
- 2 Pastas hierarquicas
- 1 Documento de exemplo

**Iniciar servidor:**
```bash
npm run dev
```

Servidor rodando em: `http://localhost:3000`

**Testar API:**
```bash
curl http://localhost:3000/api/health
```

Deve retornar:
```json
{
  "status": "ok",
  "mensagem": "SIGAD API funcionando"
}
```

### 2. Frontend (ja esta rodando)

O frontend React ja esta configurado e rodando automaticamente no ambiente Figma Make. Simplesmente navegue pela interface.

#### Credenciais de Teste

- **Email**: admin@minplan.gov.ao
- **Senha**: admin123

## Navegacao da Interface

### Sidebar Esquerda
- **Principal**: Dashboard, Arquivo Digital, Arquivo Fisico
- **Operacoes**: Emprestimos, Pesquisa, Digitalizacao, Relatorios
- **Gestao**: Utilizadores, Instituicoes, Configuracoes

### Paginas Implementadas

1. **Dashboard** (`/`)
   - Estatisticas gerais
   - Graficos de actividade
   - Alertas do sistema
   - Documentos recentes

2. **Emprestimos** (`/emprestimos`)
   - Cards visuais com status colorido
   - Emprestimos activos e atrasados
   - Pedidos pendentes de aprovacao

3. **Arquivo Digital** (`/arquivo-digital`)
   - Navegacao por pastas
   - Listagem de documentos
   - Filtros e ordenacao

4. **Digitalizacao** (`/digitalizacao`)
   - Fila de documentos
   - Status e prioridades
   - Gestao de operadores

## Testar Funcionalidades

### 1. Ver Dashboard
Acesse a raiz `/` para ver estatisticas gerais

### 2. Explorar Emprestimos
Navegue para `/emprestimos` para ver:
- 3 emprestimos activos
- 2 pedidos pendentes
- Sistema de alertas por cor

### 3. Navegar Arquivo Digital
Va para `/arquivo-digital` para:
- Ver pastas organizadas
- Listar documentos
- Filtrar por tipo

### 4. Verificar Fila de Digitalizacao
Acesse `/digitalizacao` para:
- Ver documentos aguardando digitalizacao
- Prioridades (Urgente, Alta, Normal, Baixa)
- Status (Pendente, Em Progresso, Concluido)

## Testar API com cURL

### Listar Instituicoes
```bash
curl http://localhost:3000/api/instituicoes
```

### Listar Documentos
```bash
curl "http://localhost:3000/api/documentos?instituicao_id=1"
```

### Criar Documento
```bash
curl -X POST http://localhost:3000/api/documentos \
  -H "Content-Type: application/json" \
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
    "data_devolucao_prevista": "2026-06-01",
    "motivo": "Consulta para relatorio",
    "aprovado_por": 1
  }'
```

### Listar Emprestimos Activos
```bash
curl "http://localhost:3000/api/emprestimos?instituicao_id=1"
```

### Listar Emprestimos Atrasados
```bash
curl "http://localhost:3000/api/emprestimos/atrasados?instituicao_id=1"
```

## Estrutura de Base de Dados

### Tabelas Principais

- `instituicoes` - Organizacoes cadastradas
- `usuarios` - Utilizadores do sistema
- `pastas` - Estrutura hierarquica de pastas
- `documentos` - Documentos fisicos e digitais
- `emprestimos` - Rastreamento de emprestimos
- `fila_digitalizacao` - Fila de digitalizacao
- `niveis_confidencialidade` - Publico, Restrito, Confidencial, Secreto
- `tipos_documento` - Oficio, Despacho, Contrato, etc.
- `auditoria` - Log de todas as accoes

### Ver Base de Dados

Use um visualizador SQLite como:
- **DB Browser for SQLite** (recomendado)
- DBeaver
- SQLiteStudio

Ficheiro: `server/database/sigad.db`

## Proximos Passos

1. **Explorar a interface** - Navegue por todas as paginas
2. **Testar a API** - Use os exemplos de cURL acima
3. **Ver os dados** - Abra a base de dados SQLite
4. **Ler documentacao**:
   - `FRONTEND.md` - Documentacao da interface
   - `server/ARQUITETURA.md` - Arquitetura do backend
   - `server/API_REFERENCE.md` - Referencia completa da API

## Problemas Comuns

### Porta 3000 em uso
```bash
# Alterar porta no server/.env
PORT=3001
```

### Erros de dependencias
```bash
cd server
rm -rf node_modules
npm install
```

### Base de dados corrompida
```bash
cd server
rm database/sigad.db
npm run init-db
npm run seed
```

## Ferramentas Uteis

- **Postman** / **Insomnia** - Testar API
- **DB Browser for SQLite** - Visualizar base de dados
- **VS Code** - Editor de codigo recomendado

## Suporte

- Consulte `README.md` para visao geral
- Leia `FRONTEND.md` para detalhes da interface
- Veja `server/ARQUITETURA.md` para detalhes tecnicos
- Revise `server/API_REFERENCE.md` para endpoints da API
