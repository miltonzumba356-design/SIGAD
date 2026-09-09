import { Response } from 'express';
import { AutorizacaoDownloadModel } from '../models/AutorizacaoDownloadModel';
import { DocumentoModel } from '../models/DocumentoModel';
import { AuthRequest } from '../middleware/auth';

function isAdmin(req: AuthRequest): boolean {
  return req.usuario!.role_id === 1 || req.usuario!.role_id === 2;
}

export class AutorizacaoDownloadController {
  /**
   * POST /documents/:id/download-request
   * Um utilizador sem privilégios de admin solicita download sem marca d'água.
   */
  static solicitar(req: AuthRequest, res: Response) {
    try {
      const documentoId = Number(req.params.id);
      const documento = DocumentoModel.buscarPorId(documentoId);

      if (!documento || documento.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento não encontrado.' } });
      }

      if (isAdmin(req)) {
        return res.status(400).json({ error: { code: 'NOT_APPLICABLE', message: 'Administradores já podem descarregar sem marca d\'água.' } });
      }

      if (AutorizacaoDownloadModel.temAutorizacaoAprovada(documentoId, req.usuario!.id)) {
        return res.status(400).json({ error: { code: 'ALREADY_APPROVED', message: 'Já tem autorização aprovada para este documento.' } });
      }

      if (AutorizacaoDownloadModel.temPedidoPendente(documentoId, req.usuario!.id)) {
        return res.status(400).json({ error: { code: 'ALREADY_PENDING', message: 'Já existe um pedido pendente para este documento.' } });
      }

      const id = AutorizacaoDownloadModel.solicitar(documentoId, req.usuario!.id, req.body?.motivo);
      res.status(201).json({ data: { id, message: 'Pedido de download sem marca d\'água enviado para aprovação.' } });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao solicitar autorização de download.' } });
    }
  }

  /**
   * GET /download-requests?estado=PENDENTE
   * Apenas administradores.
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'Sem permissão para ver pedidos de download.' } });
      }
      const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
      const pedidos = AutorizacaoDownloadModel.listarPorInstituicao(req.usuario!.instituicao_id, estado);
      res.json({ data: pedidos });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar pedidos de download.' } });
    }
  }

  /**
   * PATCH /download-requests/:id/respond
   * Apenas administradores.
   */
  static responder(req: AuthRequest, res: Response) {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: { code: 'PERMISSION_DENIED', message: 'Sem permissão para responder a pedidos de download.' } });
      }

      const id = Number(req.params.id);
      const pedido = AutorizacaoDownloadModel.buscarPorId(id);
      if (!pedido || pedido.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pedido não encontrado.' } });
      }

      const { approved, notas } = req.body;
      const sucesso = AutorizacaoDownloadModel.responder(id, req.usuario!.id, Boolean(approved), notas);

      if (sucesso) {
        res.json({ data: { message: approved ? 'Pedido aprovado.' : 'Pedido rejeitado.' } });
      } else {
        res.status(400).json({ error: { code: 'RESPOND_FAILED', message: 'Este pedido já foi respondido.' } });
      }
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao responder ao pedido de download.' } });
    }
  }
}
