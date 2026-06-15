import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { registrarAuditoria } from './auditoria';

export interface AuthRequest extends Request {
  usuario?: {
    id: number;
    instituicao_id: number;
    role_id: number;
    departamento_id?: number;
    permissoes: string[];
  };
}

/**
 * Middleware de autenticacao global.
 */
export function verificarAutenticacao(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token de autenticacao nao fornecido.' }
      });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    req.usuario = {
      id: decoded.id,
      instituicao_id: decoded.instituicao_id,
      role_id: decoded.role_id,
      departamento_id: decoded.departamento_id,
      permissoes: decoded.permissoes || []
    };

    next();
  } catch {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token invalido ou expirado.' }
    });
  }
}

/**
 * Middleware de verificacao de permissao.
 * Super Admin e Admin Institucional passam por bypass controlado.
 */
export function temPermissao(permissaoRequerida: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Nao autenticado.' } });
      return;
    }

    if (req.usuario.role_id === 1 || req.usuario.role_id === 2) {
      next();
      return;
    }

    if (!req.usuario.permissoes.includes(permissaoRequerida)) {
      registrarAuditoria({
        usuario_id: req.usuario.id,
        instituicao_id: req.usuario.instituicao_id,
        acao: 'PERMISSAO_NEGADA',
        entidade: 'access_control',
        detalhes: {
          permissao: permissaoRequerida,
          method: req.method,
          url: req.originalUrl
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'Sem permissao para esta operacao.' } });
      return;
    }

    next();
  };
}

/**
 * Middleware de permissao para endpoints que aceitam mais de uma permissao.
 */
export function temQualquerPermissao(permissoesRequeridas: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Nao autenticado.' } });
      return;
    }

    if (req.usuario.role_id === 1 || req.usuario.role_id === 2) {
      next();
      return;
    }

    const permitido = permissoesRequeridas.some(permissao => req.usuario!.permissoes.includes(permissao));
    if (!permitido) {
      registrarAuditoria({
        usuario_id: req.usuario.id,
        instituicao_id: req.usuario.instituicao_id,
        acao: 'PERMISSAO_NEGADA',
        entidade: 'access_control',
        detalhes: {
          permissoes: permissoesRequeridas,
          method: req.method,
          url: req.originalUrl
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
      res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'Sem permissao para esta operacao.' } });
      return;
    }

    next();
  };
}

/**
 * Middleware de isolamento multi-institucional.
 */
export function isolamentoInstituicao(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Nao autenticado.' } });
    return;
  }

  if (req.method === 'GET') {
    req.query.instituicao_id = req.usuario.instituicao_id.toString();
  } else {
    req.body.instituicao_id = req.usuario.instituicao_id;
  }

  next();
}
