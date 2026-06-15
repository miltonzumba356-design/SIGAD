import { Request, Response, NextFunction } from 'express';

export function headersSeguranca(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  if (
    req.originalUrl.startsWith('/api/v1/documents') ||
    req.originalUrl.startsWith('/api/v1/auth') ||
    req.originalUrl.startsWith('/api/v1/users')
  ) {
    res.setHeader('Cache-Control', 'no-store');
  }

  next();
}

export function saneamentoInput(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body, getAllowedBodyKeys(req));
  }
  next();
}

function getAllowedBodyKeys(req: Request): Set<string> {
  if (req.method === 'POST' && req.originalUrl.startsWith('/api/v1/auth/switch-institution')) {
    return new Set(['instituicao_id', 'institution_id']);
  }
  return new Set();
}

function sanitizeObject(value: unknown, allowedKeys: Set<string>): void {
  if (!value || typeof value !== 'object') return;

  const blockedKeys = new Set([
    '__proto__',
    'constructor',
    'prototype',
    'id',
    'created_at',
    'updated_at',
    'deleted_at',
    'deleted_by',
    'institution_id',
    'instituicao_id'
  ]);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (blockedKeys.has(key) && !allowedKeys.has(key)) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    sanitizeObject((value as Record<string, unknown>)[key], allowedKeys);
  }
}
