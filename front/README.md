# SIGAD - Sistema Integrado de Gestao de Arquivos e Documentos

Sistema de gestao documental para instituicoes publicas e privadas em Angola.

Interface web moderna com tema escuro e dourado desenvolvida em React + TypeScript.
Backend API RESTful com Express e SQLite.

## Descricao

O SIGAD e uma plataforma completa para gestao de arquivos fisicos e digitais, desenvolvida especificamente para atender as necessidades de modernizacao administrativa do sector publico angolano.

## Funcionalidades

### Gestao de Documentos
- Arquivo organizado por pastas hierarquicas
- Classificacao por tipo de documento
- Controlo de confidencialidade (Publico, Restrito, Confidencial, Secreto)
- Suporte para documentos fisicos e digitais
- Localizacao fisica detalhada
- Metadados completos

### Gestao de Emprestimos
- Registo de emprestimos de documentos fisicos
- Controlo automatico de prazos
- Alertas de documentos atrasados
- Historico completo de movimentacoes

### Digitalizacao
- Fila de priorizacao de digitalizacao
- Gestao de workflow de digitalizacao
- Suporte para OCR (futuro)

### Multi-institucional
- Suporte para multiplas instituicoes
- Isolamento completo de dados
- Gestao independente por instituicao

### Auditoria e Relatorios
- Log completo de todas as acoes
- Relatorios de actividade
- Estatisticas por instituicao
- Documentos proximos da eliminacao

## Estrutura do Projecto

```
/
├── src/                 # Frontend (React + TypeScript)
│   ├── app/
│   │   ├── components/  # Componentes React
│   │   │   ├── layout/  # Layout (Sidebar, Topbar)
│   │   │   ├── dashboard/
│   │   │   ├── common/
│   │   │   └── ui/      # Componentes base
│   │   ├── pages/       # Paginas da aplicacao
│   │   └── App.tsx      # Configuracao de rotas
│   └── styles/          # CSS e tema
│
├── server/              # Backend API (Express + SQLite)
│   ├── src/
│   │   ├── config/      # Configuracoes
│   │   ├── models/      # Modelos de dados
│   │   ├── controllers/ # Controladores
│   │   ├── routes/      # Rotas da API
│   │   ├── middleware/  # Middlewares
│   │   ├── services/    # Servicos
│   │   └── types/       # Tipos TypeScript
│   └── database/        # Base de dados SQLite
│
└── node_modules/        # Dependencias
```

## Tecnologias

### Frontend
- React 18.3.1 + TypeScript
- React Router 7 (navegacao)
- Tailwind CSS v4 (estilizacao)
- Radix UI (componentes)
- Lucide React (icones)
- Recharts (graficos)
- Vite (bundler)

### Backend
- Node.js + TypeScript
- Express.js
- SQLite (better-sqlite3)
- bcryptjs (autenticacao)
- JWT (tokens)

## Instalacao e Execucao

### Requisitos
- Node.js 18+
- pnpm (recomendado) ou npm

### 1. Configurar Backend

```bash
cd server
npm install
cp .env.example .env
npm run init-db
npm run seed
npm run dev
```

O servidor API estara em `http://localhost:3000`

### 2. Frontend (Desenvolvimento)

O frontend ja esta configurado e roda automaticamente no ambiente Figma Make.

Para desenvolvimento local fora do Figma Make:
```bash
pnpm install
pnpm run dev
```

## API Endpoints

### Saude do Sistema
- `GET /api/health` - Verificar status da API

### Instituicoes
- `POST /api/instituicoes` - Criar instituicao
- `GET /api/instituicoes` - Listar instituicoes
- `GET /api/instituicoes/:id` - Buscar instituicao
- `PUT /api/instituicoes/:id` - Atualizar instituicao
- `DELETE /api/instituicoes/:id` - Desativar instituicao

### Documentos
- `POST /api/documentos` - Criar documento
- `GET /api/documentos` - Listar documentos (com filtros)
- `GET /api/documentos/:id` - Buscar documento
- `PUT /api/documentos/:id` - Atualizar documento
- `DELETE /api/documentos/:id` - Excluir documento
- `GET /api/documentos/instituicao/:id/estatisticas` - Estatisticas

### Emprestimos
- `POST /api/emprestimos` - Registar emprestimo
- `GET /api/emprestimos` - Listar emprestimos ativos
- `GET /api/emprestimos/atrasados` - Listar atrasados
- `GET /api/emprestimos/:id` - Buscar emprestimo
- `PUT /api/emprestimos/:id/devolucao` - Registar devolucao
- `GET /api/emprestimos/documento/:id/historico` - Historico
- `GET /api/emprestimos/estatisticas` - Estatisticas

## Dados de Teste

Apos executar `npm run seed`, use estas credenciais:

- **Email**: admin@minplan.gov.ao
- **Senha**: admin123

## Documentacao

### Frontend
- [Frontend - Interface de Utilizador](FRONTEND.md)

### Backend
- [Arquitetura do Sistema](server/ARQUITETURA.md)
- [API Reference](server/API_REFERENCE.md)
- [Inicio Rapido](server/INICIO_RAPIDO.md)
- [README Backend](server/README.md)

## Estado do Projecto

### Implementado
- [x] Backend API completo (Express + SQLite)
- [x] Interface frontend moderna (React + Tailwind)
- [x] Dashboard com estatisticas e graficos
- [x] Gestao de emprestimos com alertas visuais
- [x] Navegacao de arquivo digital
- [x] Fila de digitalizacao
- [x] Tema escuro com cores douradas
- [x] Layout responsivo com sidebar e topbar
- [x] Sistema de rotas (React Router)

### Em Desenvolvimento
- [ ] Integracao frontend-backend
- [ ] Autenticacao JWT
- [ ] Arquivo fisico (arvore de localizacao)
- [ ] Pesquisa avancada
- [ ] Relatorios (PDF)
- [ ] Gestao de utilizadores
- [ ] Gestao de instituicoes

### Roadmap Futuro
- [ ] Upload de ficheiros com drag & drop
- [ ] OCR para digitalizacao
- [ ] Notificacoes por email
- [ ] Integracao com sistemas externos
- [ ] App mobile

## Contribuicao

Este e um projeto do Governo de Angola. Contribuicoes sao bem-vindas mediante aprovacao.

## Licenca

Propriedade do Governo de Angola - 2026
Todos os direitos reservados
