import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/database';
import type { AuthRequest } from './auth';

/**
 * Registra uma acao de auditoria de forma append-only.
 */
export function registrarAuditoria(dados: {
  usuario_id?: number,
  instituicao_id?: number,
  acao: string,
  entidade: string,
  entidade_id?: number,
  detalhes?: any,
  ip_address?: string,
  user_agent?: string
}): void {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO auditoria (
        usuario_id, instituicao_id, acao, entidade, entidade_id, detalhes, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dados.usuario_id || null,
      dados.instituicao_id || null,
      dados.acao,
      dados.entidade,
      dados.entidade_id || null,
      dados.detalhes ? JSON.stringify(dados.detalhes) : null,
      dados.ip_address || null,
      dados.user_agent || null
    );
  } catch (error) {
    console.error('CRITICAL: Audit log failed:', error);
  }
}

/**
 * Middleware para auditoria automatica de rotas.
 */
export function auditoriaMiddleware(acao: string, entidade: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      registrarAuditoria({
        usuario_id: req.usuario?.id,
        instituicao_id: req.usuario?.instituicao_id,
        acao,
        entidade,
        entidade_id: typeof req.params.id === 'string' ? Number(req.params.id) : undefined,
        detalhes: {
          status_code: res.statusCode,
          method: req.method,
          url: req.originalUrl,
          body: req.method !== 'GET' ? sanitizeAuditPayload(req.body) : undefined
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    });

    next();
  };
}

function sanitizeAuditPayload(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => sanitizeAuditPayload(item));

  const hiddenKeys = new Set([
    'password',
    'senha',
    'senha_hash',
    'access_token',
    'refresh_token',
    'token',
    'file',
    'ocr_text',
    'ocr_texto'
  ]);

  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (hiddenKeys.has(key)) return [key, '[REDACTED]'];
    return [key, sanitizeAuditPayload(item)];
  }));
}
