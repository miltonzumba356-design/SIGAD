# SIGAD Backend - Implementacao Completa

Backend API RESTful completamente implementado e documentado.

## Status do Projeto

### Implementado Completamente

- [x] **Arquitetura monolitica** com separacao de responsabilidades
- [x] **Base de dados SQLite** com 9 tabelas e indices
- [x] **Autenticacao JWT** com expiracao de 8 horas
- [x] **Sistema de permissoes** (BASICO, MODERADOR, ADMINISTRADOR)
- [x] **Middleware de auditoria** para rastreamento completo
- [x] **Validacao de dados** com express-validator
- [x] **Comentarios detalhados** em todo o codigo
- [x] **29 ficheiros TypeScript** organizados
- [x] **40+ endpoints REST** documentados
- [x] **Sistema multi-institucional** (multi-tenancy)
- [x] **CRUD completo** para todas as entidades

## Estrutura do Codigo

```
server/src/
├── config/               # Configuracoes
│   ├── database.ts       # Conexao SQLite
│   └── initDatabase.ts   # Schema e dados iniciais
│
├── types/                # Interfaces TypeScript
│   └── index.ts          # Tipos de todas as entidades
│
├── middleware/           # Middlewares
│   ├── auth.ts           # Autenticacao JWT
│   ├── validator.ts      # Validacao de dados
│   └── auditoria.ts      # Log de operacoes
│
├── models/               # Camada de dados
│   ├── UsuarioModel.ts
│   ├── InstituicaoModel.ts
│   ├── PastaModel.ts
│   ├── DocumentoModel.ts
│   ├── EmprestimoModel.ts
│   └── FilaDigitalizacaoModel.ts
│
├── controllers/          # Logica de negocio
│   ├── AuthController.ts
│   ├── UsuarioController.ts
│   ├── InstituicaoController.ts
│   ├── PastaController.ts
│   ├── DocumentoController.ts
│   ├── EmprestimoController.ts
│   └── FilaDigitalizacaoController.ts
│
├── routes/               # Definicao de rotas
│   ├── index.ts          # Agregador
│   ├── auth.ts
│   ├── usuarios.ts
│   ├── instituicoes.ts
│   ├── pastas.ts
│   ├── documentos.ts
│   ├── emprestimos.ts
│   └── digitalizacao.ts
│
├── scripts/
│   └── seed.ts           # Dados de teste
│
└── index.ts              # Ponto de entrada
```

## Entidades e Modelos

### 1. Usuarios
- **Autenticacao** com bcrypt
- **Niveis de acesso**: BASICO, MODERADOR, ADMINISTRADOR
- **Soft delete** (desativacao)
- **Troca de senha** pelo proprio usuario

### 2. Instituicoes
- **Multi-tenancy** para isolamento de dados
- Cada instituicao tem usuarios e documentos proprios
- **Codigo unico** para identificacao

### 3. Pastas
- **Estrutura hierarquica** (arvore)
- Pastas raiz e subpastas
- **Classificacao** por nivel de confidencialidade

### 4. Documentos
- **Fisicos**, **digitais** ou **hibridos**
- **7 tipos** pre-definidos (Oficio, Despacho, etc)
- **4 niveis** de confidencialidade
- **Metadados completos** (autor, data, localizacao)
- **Busca avancada** com multiplos filtros

### 5. Emprestimos
- **Controlo de prazos** de devolucao
- **Deteccao automatica** de atrasos
- **Historico completo** por documento
- **Aprovacao** de emprestimos

### 6. Fila de Digitalizacao
- **Sistema de priorizacao** (URGENTE → BAIXA)
- **Workflow** completo: Pendente → Em Progresso → Concluido
- **Atribuicao** de operadores
- **Estatisticas** de progresso

## Rotas Implementadas (40+)

### Autenticacao (4 rotas)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuario atual
- `POST /api/auth/alterar-senha` - Alterar senha

### Usuarios (5 rotas)
- `POST /api/usuarios` - Criar
- `GET /api/usuarios` - Listar
- `GET /api/usuarios/:id` - Buscar
- `PUT /api/usuarios/:id` - Atualizar
- `DELETE /api/usuarios/:id` - Desativar

### Instituicoes (5 rotas)
- `POST /api/instituicoes` - Criar
- `GET /api/instituicoes` - Listar
- `GET /api/instituicoes/:id` - Buscar
- `PUT /api/instituicoes/:id` - Atualizar
- `DELETE /api/instituicoes/:id` - Desativar

### Pastas (6 rotas)
- `POST /api/pastas` - Criar
- `GET /api/pastas` - Listar
- `GET /api/pastas/:id` - Buscar
- `GET /api/pastas/:id/subpastas` - Subpastas
- `PUT /api/pastas/:id` - Atualizar
- `DELETE /api/pastas/:id` - Excluir

### Documentos (6 rotas)
- `POST /api/documentos` - Criar
- `GET /api/documentos` - Listar (com filtros)
- `GET /api/documentos/:id` - Buscar
- `PUT /api/documentos/:id` - Atualizar
- `DELETE /api/documentos/:id` - Excluir
- `GET /api/documentos/instituicao/:id/estatisticas` - Estatisticas

### Emprestimos (7 rotas)
- `POST /api/emprestimos` - Criar
- `GET /api/emprestimos` - Listar ativos
- `GET /api/emprestimos/atrasados` - Listar atrasados
- `GET /api/emprestimos/estatisticas` - Estatisticas
- `GET /api/emprestimos/:id` - Buscar
- `PUT /api/emprestimos/:id/devolucao` - Registrar devolucao
- `GET /api/emprestimos/documento/:id/historico` - Historico

### Digitalizacao (7 rotas)
- `POST /api/digitalizacao` - Adicionar a fila
- `GET /api/digitalizacao` - Listar fila
- `GET /api/digitalizacao/estatisticas` - Estatisticas
- `GET /api/digitalizacao/:id` - Buscar item
- `PUT /api/digitalizacao/:id/iniciar` - Iniciar
- `PUT /api/digitalizacao/:id/concluir` - Concluir
- `PUT /api/digitalizacao/:id/cancelar` - Cancelar

## Seguranca

### Autenticacao JWT
- Tokens assinados com chave secreta
- Expiracao de 8 horas
- Middleware de verificacao em todas as rotas protegidas

### Autorizacao
- 3 niveis de acesso (BASICO, MODERADOR, ADMINISTRADOR)
- Controlo granular por endpoint
- Verificacao de instituicao (multi-tenancy)

### Validacao
- express-validator em todos os inputs
- Validacao de tipos, formatos e tamanhos
- Sanitizacao de dados

### Auditoria
- Log automatico de todas as operacoes CRUD
- Registro de IP, usuario, acao e timestamp
- Rastreabilidade completa

### Protecao de Dados
- Senhas com hash bcrypt (10 rounds)
- SQLite com foreign keys habilitadas
- Prepared statements (previne SQL injection)

## Funcionalidades Avancadas

### Multi-tenancy
- Isolamento completo de dados por instituicao
- Usuario pertence a uma instituicao
- Documentos organizados por instituicao

### Soft Delete
- Usuarios e instituicoes desativados, nao excluidos
- Preserva integridade referencial
- Permite reativacao

### Busca Avancada
- Filtros multiplos em documentos
- Busca textual em titulo, codigo e descricao
- Combinacao de filtros

### Estatisticas
- Documentos por tipo e nivel
- Emprestimos ativos e atrasados
- Progresso da digitalizacao

### Hierarquia de Pastas
- Arvore de pastas pai/filha
- Navegacao hierarquica
- Codigo de classificacao

## Comentarios no Codigo

Todos os ficheiros incluem:
- **Headers** explicando o proposito do modulo
- **Comentarios de funcao** com parametros e retorno
- **Exemplos de uso** nas rotas
- **Descricao detalhada** de cada endpoint
- **Formato de request/response** documentado

## Documentacao

### Ficheiros de Documentacao
1. **README.md** - Visao geral do backend
2. **ARQUITETURA.md** - Design e decisoes tecnicas
3. **API_REFERENCE.md** - Referencia de endpoints
4. **INICIO_RAPIDO.md** - Guia de inicio
5. **ROTAS_COMPLETAS.md** - Todas as rotas documentadas
6. **BACKEND_COMPLETO.md** (este ficheiro)

## Como Usar

### 1. Instalar Dependencias
```bash
cd server
npm install
```

### 2. Configurar Ambiente
```bash
cp .env.example .env
```

### 3. Inicializar Base de Dados
```bash
npm run init-db
```

### 4. Popular com Dados de Teste
```bash
npm run seed
```

### 5. Iniciar Servidor
```bash
npm run dev
```

### 6. Testar
```bash
curl http://localhost:3000/api/health
```

## Credenciais de Teste

Apos executar `npm run seed`:

```
Email: admin@minplan.gov.ao
Senha: admin123
```

## Proximos Passos

O backend esta 100% funcional. Proximo trabalho:

1. **Integracao com Frontend**
   - Conectar React ao Express
   - Substituir dados mocados por API calls
   - Implementar gestao de estado (React Query)

2. **Upload de Ficheiros**
   - Middleware Multer configurado
   - Armazenamento de documentos digitais
   - Validacao de tipos e tamanhos

3. **Melhorias Futuras**
   - Paginacao em listagens grandes
   - Cache com Redis
   - Rate limiting
   - Compressao de respostas
   - HTTPS em producao

## Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express 4.18** - Framework web
- **TypeScript** - Tipagem estatica
- **SQLite** (better-sqlite3) - Base de dados
- **JWT** (jsonwebtoken) - Autenticacao
- **bcrypt** - Hash de senhas
- **express-validator** - Validacao
- **CORS** - Cross-origin requests
- **dotenv** - Variaveis de ambiente

## Performance

- **Indices** em colunas frequentemente consultadas
- **SQLite WAL mode** para melhor concorrencia
- **Prepared statements** para queries otimizadas
- **Foreign keys** habilitadas
- **Transacoes** em operacoes complexas

## Conclusao

O backend do SIGAD esta completamente implementado, comentado e documentado. Todas as 40+ rotas funcionam corretamente, com autenticacao, autorizacao, validacao e auditoria completas.

O codigo esta pronto para uso em producao apos configuracao adequada de:
- Variaveis de ambiente
- Chaves secretas
- CORS policies
- Backups da base de dados
