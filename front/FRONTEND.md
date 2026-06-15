# Frontend SIGAD - Interface de Utilizador

## Visao Geral

Interface web moderna desenvolvida com React, TypeScript e Tailwind CSS, utilizando um tema escuro com dourado/ambar como cor de destaque.

## Tecnologias

- **React 18.3.1** - Biblioteca UI
- **TypeScript** - Tipagem estatica
- **React Router 7** - Navegacao SPA
- **Tailwind CSS v4** - Estilizacao
- **Radix UI** - Componentes acessiveis
- **Lucide React** - Icones
- **Recharts** - Graficos e visualizacoes
- **Material UI** - Componentes adicionais

## Estrutura

```
src/app/
├── components/
│   ├── layout/          # Layout principal
│   │   ├── Layout.tsx   # Container principal
│   │   ├── Sidebar.tsx  # Barra lateral de navegacao
│   │   └── Topbar.tsx   # Barra superior
│   ├── dashboard/       # Componentes do dashboard
│   │   ├── RecentDocuments.tsx
│   │   ├── ActivityChart.tsx
│   │   └── Alerts.tsx
│   ├── common/          # Componentes reutilizaveis
│   │   └── StatCard.tsx
│   └── ui/              # Componentes base
├── pages/               # Paginas da aplicacao
│   ├── Dashboard.tsx
│   ├── Emprestimos.tsx
│   ├── ArquivoDigital.tsx
│   ├── Digitalizacao.tsx
│   └── EmConstrucao.tsx
└── App.tsx              # Configuracao de rotas
```

## Layout

### 1. Sidebar (Barra Lateral)

**Localizacao**: Esquerda, fixa

**Conteudo**:
- Logotipo e nome do sistema (SIGAD)
- Seletor de instituicao (dropdown)
- Menu de navegacao organizado em 3 seccoes:
  - **Principal**: Dashboard, Arquivo Digital, Arquivo Fisico
  - **Operacoes**: Emprestimos, Pesquisa, Digitalizacao, Relatorios
  - **Gestao**: Utilizadores, Instituicoes, Configuracoes
- Perfil do utilizador no rodape

**Funcionalidades**:
- Badges numericos para alertas e pendencias
- Menu activo destacado em dourado
- Hover states suaves

### 2. Topbar (Barra Superior)

**Localizacao**: Topo, fixa

**Conteudo**:
- Titulo e subtitulo da pagina actual
- Barra de pesquisa rapida de documentos
- Botoes de accao:
  - "Novo Documento" (primario, dourado)
  - "Upload" (secundario)

### 3. Area de Conteudo

**Localizacao**: Centro/direita, scrollavel

**Conteudo varia por pagina**:

#### Dashboard
- 4 cartoes KPI (estatisticas principais)
- Grafico de barras de actividade mensal
- Painel de alertas activos
- Tabela de documentos recentes
- Actividade por departamento
- Tipos de documento

#### Emprestimos
- 3 cartoes de estatisticas (Total, A Vencer, Atrasados)
- Cards visuais de emprestimos activos com status colorido:
  - Verde: No prazo
  - Laranja: A vencer
  - Vermelho: Atrasado
- Tabela de pedidos pendentes com accoes (Aprovar/Rejeitar)

#### Arquivo Digital
- Breadcrumb de navegacao
- Grid de pastas com contador de documentos
- Filtros e ordenacao
- Tabela de documentos com:
  - Nome, tipo, tamanho, data
  - Badge de confidencialidade
  - Accoes: Ver, Download, Mais opcoes

#### Digitalizacao
- 4 cartoes de estatisticas da fila
- Tabela completa com:
  - Informacao do documento
  - Localizacao fisica
  - Badge de prioridade (Urgente/Alta/Normal/Baixa)
  - Status (Pendente/Em Progresso/Concluido)
  - Operador responsavel
  - Botoes de accao contextual

## Tema de Cores

### Cores Principais
- **Background**: `#0a0a0f` (preto profundo)
- **Foreground**: `#f5f5f5` (branco suave)
- **Primary** (Dourado): `#d4af37`
- **Card**: `#1a1a24`
- **Border**: `#2a2a3a`

### Cores Semanticas
- **Success** (Verde): `#10b981`
- **Warning** (Laranja): `#f59e0b`
- **Destructive** (Vermelho): `#dc2626`
- **Info** (Azul): `#3b82f6`

### Aplicacao
- Dourado: Accoes primarias, links activos, destaques
- Verde: Status positivo, documentos disponiveis
- Laranja: Alertas, itens a vencer
- Vermelho: Erros, atrasos criticos
- Azul: Informacoes, badges informativos

## Rotas

| Rota | Componente | Descricao |
|------|------------|-----------|
| `/` | Dashboard | Pagina inicial com visao geral |
| `/emprestimos` | Emprestimos | Gestao de emprestimos |
| `/arquivo-digital` | ArquivoDigital | Navegacao de documentos digitais |
| `/digitalizacao` | Digitalizacao | Fila de digitalizacao |
| `/arquivo-fisico` | EmConstrucao | Em desenvolvimento |
| `/pesquisa` | EmConstrucao | Em desenvolvimento |
| `/relatorios` | EmConstrucao | Em desenvolvimento |
| `/utilizadores` | EmConstrucao | Em desenvolvimento |
| `/instituicoes` | EmConstrucao | Em desenvolvimento |
| `/configuracoes` | EmConstrucao | Em desenvolvimento |

## Componentes Principais

### StatCard
Cartao de estatistica com icone, valor principal e variacao

**Props**:
- `title`: Titulo do indicador
- `value`: Valor principal
- `change`: Texto de variacao (opcional)
- `changeType`: 'positive' | 'negative' | 'neutral'
- `icon`: Componente de icone
- `iconColor`: Cor do icone

### Layout
Container principal que combina Sidebar e Topbar

**Props**:
- `children`: Conteudo da pagina
- `title`: Titulo da pagina
- `subtitle`: Subtitulo (opcional)
- `showActions`: Mostrar botoes de accao (padrao: true)
- `onNewDocument`: Callback para novo documento
- `onUpload`: Callback para upload

## Proximos Passos

1. **Integracao com API Backend**
   - Conectar ao servidor Express/SQLite
   - Implementar fetch de dados reais
   - Gestao de estado (React Query ou similar)

2. **Autenticacao**
   - Login/Logout
   - Controlo de sessao
   - Permissoes por nivel de acesso

3. **Funcionalidades Pendentes**
   - Arquivo Fisico (arvore de localizacao)
   - Pesquisa Avancada (filtros multiplos)
   - Relatorios (geracao de PDF)
   - Gestao de Utilizadores (CRUD)
   - Gestao de Instituicoes (CRUD)
   - Configuracoes do sistema

4. **Melhorias de UX**
   - Notificacoes toast (Sonner)
   - Loading states
   - Validacao de formularios (React Hook Form)
   - Confirmacoes de accoes destrutivas
   - Paginacao de tabelas

5. **Upload de Ficheiros**
   - Drag & drop
   - Progress bars
   - Validacao de tipo e tamanho
   - Preview de documentos

## Como Executar

O frontend executa automaticamente com Vite em modo desenvolvimento:

```bash
# O servidor Vite ja esta a correr
# Abre automaticamente no ambiente Figma Make
```

Para desenvolver localmente (fora do Figma Make):

```bash
npm install
npm run dev
```

## Convencoes de Codigo

- Componentes em PascalCase
- Ficheiros de componentes com extensao `.tsx`
- Props interfaces definidas no mesmo ficheiro
- Sem emojis no codigo ou interface
- Comentarios apenas quando necessario
- Tailwind classes inline (sem CSS separado)

## Acessibilidade

- Componentes Radix UI sao acessiveis por padrao
- Semantic HTML
- ARIA labels onde necessario
- Navegacao por teclado funcional
- Contraste de cores adequado (tema escuro)
