# Arquitetura do SIGAD

## Visao Geral

O SIGAD utiliza uma arquitetura monolitica modular com separacao clara de responsabilidades.

## Stack Tecnologica

- **Runtime**: Node.js
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **Base de Dados**: SQLite (better-sqlite3)
- **Autenticacao**: JWT + bcrypt
- **Validacao**: express-validator

## Estrutura de Pastas

```
server/
├── src/
│   ├── config/              # Configuracoes globais
│   │   ├── database.ts      # Conexao SQLite
│   │   └── initDatabase.ts  # Script de inicializacao do schema
│   │
│   ├── types/               # Definicoes TypeScript
│   │   └── index.ts         # Interfaces e tipos
│   │
│   ├── models/              # Camada de dados
│   │   ├── InstituicaoModel.ts
│   │   ├── UsuarioModel.ts
│   │   ├── DocumentoModel.ts
│   │   ├── PastaModel.ts
│   │   ├── EmprestimoModel.ts
│   │   └── FilaDigitalizacaoModel.ts
│   │
│   ├── controllers/         # Logica de controlo
│   │   ├── InstituicaoController.ts
│   │   ├── DocumentoController.ts
│   │   └── EmprestimoController.ts
│   │
│   ├── routes/              # Definicao de rotas
│   │   ├── index.ts         # Agregador de rotas
│   │   ├── instituicoes.ts
│   │   ├── documentos.ts
│   │   └── emprestimos.ts
│   │
│   ├── middleware/          # Middlewares customizados
│   │   └── (autenticacao, validacao, etc)
│   │
│   ├── services/            # Logica de negocio complexa
│   │   └── (servicos especializados)
│   │
│   ├── utils/               # Funcoes utilitarias
│   │   └── (helpers, formatadores, etc)
│   │
│   ├── scripts/             # Scripts de manutencao
│   │   └── seed.ts          # Dados de teste
│   │
│   └── index.ts             # Ponto de entrada
│
└── database/
    └── sigad.db             # Base de dados SQLite
```

## Camadas da Aplicacao

### 1. Camada de Rotas (Routes)
- Define endpoints da API
- Mapeia HTTP methods para controllers
- Aplica middlewares de validacao e autenticacao

### 2. Camada de Controlo (Controllers)
- Processa requests HTTP
- Invoca models para operacoes de dados
- Formata respostas JSON
- Trata erros e excecoes

### 3. Camada de Dados (Models)
- Interage diretamente com SQLite
- Queries SQL otimizadas
- Validacao de integridade de dados
- Transacoes quando necessario

### 4. Camada de Servicos (Services)
- Logica de negocio complexa
- Orquestracao de multiplos models
- Regras de negocio especificas do dominio

## Modelo de Dados

### Entidades Principais

1. **Instituicoes**
   - Representa organizacoes que usam o sistema
   - Isola dados entre diferentes instituicoes

2. **Usuarios**
   - Gestao de utilizadores do sistema
   - Controlo de acessos e permissoes
   - Vinculados a uma instituicao

3. **Pastas**
   - Organizacao hierarquica de documentos
   - Estrutura de arvore (pasta pai/filha)
   - Classificacao por nivel de confidencialidade

4. **Documentos**
   - Entidade central do sistema
   - Metadados completos
   - Suporte fisico e digital

5. **Emprestimos**
   - Rastreamento de documentos emprestados
   - Controlo de prazos e devolucoes
   - Historico completo

6. **Fila de Digitalizacao**
   - Gestao de processo de digitalizacao
   - Priorizacao de trabalhos
   - Tracking de progresso

### Niveis de Confidencialidade
- Publico
- Restrito
- Confidencial
- Secreto

## Fluxos Principais

### 1. Criacao de Documento
```
Cliente -> POST /api/documentos
  -> DocumentoController.criar()
    -> Validacao de dados
    -> DocumentoModel.criar()
      -> INSERT na base de dados
    <- Retorna ID do documento
  <- Response 201 com ID
```

### 2. Emprestimo de Documento
```
Cliente -> POST /api/emprestimos
  -> EmprestimoController.criar()
    -> Verificacao de disponibilidade
    -> EmprestimoModel.criar()
      -> INSERT na tabela emprestimos
    <- Retorna ID do emprestimo
  <- Response 201 com ID
```

### 3. Devolucao de Documento
```
Cliente -> PUT /api/emprestimos/:id/devolucao
  -> EmprestimoController.registrarDevolucao()
    -> EmprestimoModel.registrarDevolucao()
      -> UPDATE status para DEVOLVIDO
      -> Regista data_devolucao_efetiva
    <- Retorna sucesso
  <- Response 200
```

## Seguranca

### Autenticacao
- JWT (JSON Web Tokens)
- Tokens assinados com secret key
- Expiracao configuravel

### Autorizacao
- Niveis de acesso: BASICO, MODERADOR, ADMINISTRADOR
- Controlo de acesso baseado em instituicao
- Validacao de permissoes em cada endpoint

### Protecao de Dados
- Senhas com hash bcrypt (10 rounds)
- Controlo de confidencialidade de documentos
- Auditoria de todas as acoes

## Performance

### Otimizacoes
- Indices nas colunas mais consultadas
- SQLite em modo WAL (Write-Ahead Logging)
- Foreign keys habilitadas
- Prepared statements para prevenir SQL injection

### Escalabilidade
- Arquitetura modular permite migracao para microservicos
- SQLite adequado para ate ~100.000 documentos
- Para volumes maiores, migrar para PostgreSQL mantendo mesma estrutura

## Monitoramento

### Logs
- Logs de todas as operacoes
- Tabela de auditoria para rastreamento
- Registro de IP e usuario em cada acao

### Metricas
- Estatisticas de documentos por instituicao
- Relatorios de emprestimos atrasados
- Progresso da digitalizacao

## Proximos Passos

1. Implementar autenticacao JWT completa
2. Adicionar middleware de validacao
3. Criar endpoints de relatorios
4. Implementar upload de ficheiros
5. Adicionar OCR para digitalizacao
6. Dashboard de estatisticas
7. Notificacoes de emprestimos atrasados
8. API de busca avancada
