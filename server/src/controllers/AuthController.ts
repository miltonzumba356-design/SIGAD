import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UsuarioModel } from '../models/UsuarioModel';
import { InstituicaoModel } from '../models/InstituicaoModel';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';

function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET_NOT_CONFIGURED');
  }
  return process.env.JWT_SECRET;
}

function getPermissoes(roleId: number): string[] {
  const db = getDatabase();
  const permissoes = db.prepare(`
    SELECT p.codigo
    FROM permissoes p
    JOIN role_permissoes rp ON p.id = rp.permissao_id
    WHERE rp.role_id = ?
  `).all(roleId) as { codigo: string }[];
  return permissoes.map(p => p.codigo);
}

function createAccessToken(usuario: any, instituicaoId: number, permissoes: string[]): string {
  return jwt.sign(
    {
      id: usuario.id,
      instituicao_id: instituicaoId,
      departamento_id: usuario.departamento_id,
      role_id: usuario.role_id,
      permissoes
    },
    getJwtSecret(),
    { expiresIn: '15m' }
  );
}

function createRefreshSession(usuarioId: number, req: Request, instituicaoId?: number): string {
  const refreshToken = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  getDatabase().prepare(`
    INSERT INTO sessoes (usuario_id, refresh_token, ip_address, user_agent, expires_at, contexto_instituicao_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(usuarioId, refreshToken, req.ip, req.headers['user-agent'], expiresAt.toISOString(), instituicaoId || null);

  return refreshToken;
}

export class AuthController {
  /**
   * POST /auth/login
   */
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      const usuario = await UsuarioModel.buscarPorEmail(email);
      if (!usuario || !usuario.ativo || !(await UsuarioModel.verificarSenha(usuario, password))) {
        return res.status(401).json({
          error: { code: 'INVALID_CREDENTIALS', message: 'Email ou senha incorretos.' }
        });
      }

      const permissoes = getPermissoes(usuario.role_id);
      const accessToken = createAccessToken(usuario, usuario.instituicao_id!, permissoes);
      const refreshToken = createRefreshSession(usuario.id!, req, usuario.instituicao_id!);

      res.json({
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 900,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role_id: usuario.role_id,
            instituicao_id: usuario.instituicao_id,
            departamento_id: usuario.departamento_id,
            permissoes,
            instituicao_nome: (usuario as any).instituicao_nome
          }
        }
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao processar login.' } });
    }
  }

  /**
   * POST /auth/refresh
   */
  static async refresh(req: Request, res: Response) {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Refresh token obrigatorio.' } });
    }

    const db = getDatabase();
    const sessao = db.prepare(`
      SELECT *
      FROM sessoes
      WHERE refresh_token = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    `).get(refresh_token) as any;

    if (!sessao) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token invalido ou expirado.' } });
    }

    try {
      const usuario = UsuarioModel.buscarPorId(sessao.usuario_id);
      if (!usuario || !usuario.ativo) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario invalido.' } });
      }

      const permissoes = getPermissoes(usuario.role_id);
      const contextoInstituicaoId = sessao.contexto_instituicao_id || usuario.instituicao_id;
      const accessToken = createAccessToken(usuario, contextoInstituicaoId, permissoes);
      const newRefreshToken = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      db.transaction(() => {
        db.prepare('UPDATE sessoes SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').run(sessao.id);
        db.prepare(`
          INSERT INTO sessoes (usuario_id, refresh_token, ip_address, user_agent, expires_at, contexto_instituicao_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(usuario.id, newRefreshToken, req.ip, req.headers['user-agent'], expiresAt.toISOString(), contextoInstituicaoId);
      })();

      res.json({
        data: {
          access_token: accessToken,
          refresh_token: newRefreshToken,
          expires_in: 900
        }
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao renovar token.' } });
    }
  }

  /**
   * POST /auth/logout
   */
  static async logout(req: Request, res: Response) {
    const { refresh_token } = req.body;
    getDatabase().prepare('UPDATE sessoes SET revoked_at = CURRENT_TIMESTAMP WHERE refresh_token = ?').run(refresh_token);
    res.status(204).send();
  }

  /**
   * POST /auth/switch-institution
   */
  static async switchInstitution(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = Number(req.body.instituicao_id ?? req.body.institution_id);
      if (!instituicaoId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Instituicao obrigatoria.' } });
      }

      const usuario = UsuarioModel.buscarPorId(req.usuario!.id);
      const instituicao = InstituicaoModel.buscarPorId(instituicaoId);
      if (!usuario || !instituicao) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Instituicao nao encontrada.' } });
      }

      const permissoes = getPermissoes(usuario.role_id);
      const canSwitch = permissoes.includes('sys.institutions') || usuario.role_id === 1 || usuario.role_id === 2;
      if (!canSwitch && usuario.instituicao_id !== instituicaoId) {
        return res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'Sem permissao para trocar instituicao.' } });
      }

      const accessToken = createAccessToken(usuario, instituicaoId, permissoes);
      const refreshToken = createRefreshSession(usuario.id!, req, instituicaoId);

      res.json({
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 900,
          usuario: {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            role_id: usuario.role_id,
            instituicao_id: instituicaoId,
            departamento_id: usuario.departamento_id,
            permissoes,
            instituicao_nome: instituicao.nome
          }
        }
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao trocar instituicao.' } });
    }
  }
}
