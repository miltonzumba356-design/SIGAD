/**
 * SIGAD - Sistema Integrado de Gestao de Arquivos e Documentos
 *
 * Servidor Express com API RESTful
 * Desenvolvido para gestao documental em instituicoes publicas angolanas
 *
 * Tecnologias:
 * - Express.js - Framework web
 * - SQLite - Base de dados
 * - JWT - Autenticacao
 * - TypeScript - Tipagem estatica
 *
 * Autor: Governo de Angola
 * Versao: 1.0.0
 * Data: 2026
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDatabase } from './config/database';
import apiRoutes from './routes/index';
import searchRoutes from './api/search.route';

// Carrega variaveis de ambiente do arquivo .env
dotenv.config();

// Inicializa aplicacao Express
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

function getAllowedOrigins(): string[] {
  if (process.env.CORS_ALLOWED_ORIGINS) {
    return process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  if (process.env.FRONTEND_URL) {
    return [process.env.FRONTEND_URL];
  }
  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

/**
 * Middlewares Globais
 */

// CORS - Permite requisicoes de diferentes origens
// Em producao, configurar apenas origens especificas
const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem nao permitida pelo CORS.'));
  },
  credentials: true
}));

// Parser de JSON - Converte body das requisicoes para JSON
app.use(express.json({ limit: '10mb' }));

// Parser de URL encoded - Para formularios
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Inicializacao da Base de Dados
 * Conecta ao SQLite e aplica configuracoes
 */
try {
  getDatabase();
  console.log('✓ Base de dados conectada');
} catch (error) {
  console.error('✗ Erro ao conectar base de dados:', error);
  process.exit(1);
}

/**
 * Rota de Health Check
 * GET /api/health
 *
 * Verifica se a API esta funcionando
 * Usado por monitoring e load balancers
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    mensagem: 'SIGAD API funcionando',
    versao: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * Rotas da API
 * Base URL: /api
 *
 * Todas as rotas principais estao em /routes/index.ts
 */
app.use('/api', searchRoutes);
app.use('/api', apiRoutes);

/**
 * Handler 404 - Rota nao encontrada
 * Captura todas as rotas nao definidas
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    sucesso: false,
    mensagem: 'Rota nao encontrada',
    rota: req.path,
    metodo: req.method
  });
});

/**
 * Handler de Erros Global
 * Captura erros nao tratados nos controllers
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro nao tratado:', err);

  res.status(500).json({
    sucesso: false,
    mensagem: 'Erro interno do servidor',
    erro: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

/**
 * Inicia o servidor
 */
const server = app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  SIGAD API - Sistema de Gestao Documental`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Servidor rodando na porta ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`    Health: http://localhost:${PORT}/api/health`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

/**
 * Graceful Shutdown
 * Fecha conexoes ao desligar servidor
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

export default app;
