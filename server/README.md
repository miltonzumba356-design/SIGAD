# SIGAD - Sistema Integrado de Gestao de Arquivos e Documentos

API Backend do sistema SIGAD, desenvolvido com arquitetura monolitica usando Express.js e SQLite.

## Estrutura do Projeto

```
server/
├── src/
│   ├── config/          # Configuracoes (database, etc)
│   ├── controllers/     # Controllers da API
│   ├── models/          # Modelos de dados
│   ├── routes/          # Rotas da API
│   ├── middleware/      # Middlewares
│   ├── services/        # Logica de negocio
│   ├── utils/           # Utilitarios
│   ├── types/           # Tipos TypeScript
│   └── index.ts         # Ponto de entrada
├── database/
│   └── sigad.db         # Base de dados SQLite
└── uploads/             # Ficheiros carregados
```

## Funcionalidades

### 1. Gestao de Documentos
- Criar, ler, atualizar e excluir documentos
- Classificacao por tipo, pasta e nivel de confidencialidade
- Pesquisa avancada
- Estatisticas por instituicao

### 2. Gestao de Emprestimos
- Registar emprestimos de documentos fisicos
- Controlo de prazos e devolucoes
- Listagem de emprestimos atrasados
- Historico por documento e usuario

### 3. Multi-institucional
- Suporte para multiplas instituicoes
- Isolamento de dados por instituicao

### 4. Niveis de Confidencialidade
- Publico
- Restrito
- Confidencial
- Secreto

## Instalacao

```bash
cd server
npm install
```

## Configuracao

Copie o ficheiro `.env.example` para `.env` e ajuste as configuracoes:

```bash
cp .env.example .env
```

## Inicializar Base de Dados

```bash
npm run init-db
```

## Executar

### Desenvolvimento
```bash
npm run dev
```

### Producao
```bash
npm start
```

## API Endpoints

### Documentos

- `POST /api/documentos` - Criar documento
- `GET /api/documentos` - Listar documentos (com filtros)
- `GET /api/documentos/:id` - Buscar documento por ID
- `PUT /api/documentos/:id` - Atualizar documento
- `DELETE /api/documentos/:id` - Excluir documento
- `GET /api/documentos/instituicao/:id/estatisticas` - Estatisticas

### Emprestimos

- `POST /api/emprestimos` - Registar emprestimo
- `GET /api/emprestimos` - Listar emprestimos ativos
- `GET /api/emprestimos/atrasados` - Listar emprestimos atrasados
- `GET /api/emprestimos/:id` - Buscar emprestimo por ID
- `PUT /api/emprestimos/:id/devolucao` - Registar devolucao
- `GET /api/emprestimos/documento/:id/historico` - Historico de emprestimos
- `GET /api/emprestimos/estatisticas` - Estatisticas de emprestimos

## Tecnologias

- Node.js
- Express.js
- TypeScript
- SQLite (better-sqlite3)
- bcryptjs (autenticacao)
- jsonwebtoken (JWT)
- express-validator (validacao)

## Licenca

Propriedade do Governo de Angola - SIGAD 2026
