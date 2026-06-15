import { Response } from 'express';
import { UsuarioModel } from '../models/UsuarioModel';
import { AuthRequest } from '../middleware/auth';

export class UsuarioController {
  /**
   * GET /users
   * Regra 3: Lista utilizadores da instituição do utilizador autenticado
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const usuarios = UsuarioModel.listarPorInstituicao(instituicaoId);

      // Regra 1.1: Nunca expor dados sensíveis como hash de senha
      res.json({
        data: usuarios.map(u => {
          const { senha_hash, ...rest } = u as any;
          return rest;
        })
      });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar utilizadores.' } });
    }
  }

  /**
   * POST /users
   * Regra 3: Cria novo utilizador na instituição do administrador
   */
  static async criar(req: AuthRequest, res: Response) {
    try {
      const { name, email, role, department_id, active } = req.body;
      const instituicaoId = req.usuario!.instituicao_id;

      // Senha temporária gerada no servidor (Regra 3)
      const senhaTemporaria = Math.random().toString(36).slice(-8);

      const id = await UsuarioModel.criar({
        instituicao_id: instituicaoId,
        nome: name,
        email: email,
        senha: senhaTemporaria,
        role_id: role,
        departamento_id: department_id,
        ativo: active !== undefined ? active : true
      });

      // Em um cenário real, enviaríamos o email aqui
      console.log(`[SIMULAÇÃO] Senha temporária para ${email}: ${senhaTemporaria}`);

      res.status(201).json({
        data: { id, message: 'Utilizador criado com sucesso. Senha temporária enviada.' }
      });
    } catch (error: any) {
      if (error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: { code: 'DUPLICATE_EMAIL', message: 'Este email já está em uso.' } });
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar utilizador.' } });
    }
  }

  /**
   * GET /users/{id}
   */
  static buscar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const usuario = UsuarioModel.buscarPorId(id);

      if (!usuario || usuario.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Utilizador não encontrado.' } });
      }

      const { senha_hash, ...rest } = usuario as any;
      res.json({ data: rest });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar utilizador.' } });
    }
  }

  /**
   * PUT /users/{id}
   */
  static atualizar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const usuarioAtual = UsuarioModel.buscarPorId(id);

      if (!usuarioAtual || usuarioAtual.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Utilizador não encontrado.' } });
      }

      // Regra 3: Um utilizador não pode alterar o seu próprio perfil por este endpoint
      if (id === req.usuario!.id) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Use /users/me para alterar seu próprio perfil.' } });
      }

      const sucesso = UsuarioModel.atualizar(id, req.body);
      
      if (sucesso) {
        res.json({ data: { message: 'Utilizador atualizado com sucesso.' } });
      } else {
        res.status(400).json({ error: { code: 'UPDATE_FAILED', message: 'Nenhuma alteração realizada.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar utilizador.' } });
    }
  }

  /**
   * PATCH /users/{id}/deactivate
   */
  static desactivar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      
      if (id === req.usuario!.id) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Não é possível desactivar a própria conta.' } });
      }

      const sucesso = UsuarioModel.softDelete(id, req.usuario!.id);
      
      if (sucesso) {
        res.json({ data: { message: 'Utilizador desactivado com sucesso.' } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Utilizador não encontrado.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao desactivar utilizador.' } });
    }
  }

  /**
   * GET /users/me
   */
  static me(req: AuthRequest, res: Response) {
    try {
      const usuario = UsuarioModel.buscarPorId(req.usuario!.id);
      const { senha_hash, ...rest } = usuario as any;
      res.json({ data: rest });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao obter dados do perfil.' } });
    }
  }
}
