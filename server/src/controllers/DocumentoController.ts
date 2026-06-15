import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { DocumentoModel } from '../models/DocumentoModel';
import { FicheiroModel } from '../models/FicheiroModel';
import { LocalizacaoFisicaModel } from '../models/LocalizacaoFisicaModel';
import { PastaModel } from '../models/PastaModel';
import { AuthRequest } from '../middleware/auth';
import type { Documento } from '../types';
import { indexDocument } from '../search/documentIndexer';
import { extractPdf } from '../search/extractors/pdfExtractor';
import { extractText } from '../search/extractors/textExtractor';
import { extractOcr } from '../search/extractors/ocrExtractor';
import { normalizeText } from '../search/textNormalizer';

export class DocumentoController {
  /**
   * Lista documentos da instituicao autenticada.
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const { page = 1, limit = 20, classificacao, busca, pasta_id, somente_raiz, localizacao_id } = req.query;

      const documentos = DocumentoModel.listarPorInstituicao(instituicaoId, {
        classificacao,
        busca,
        pasta_id: pasta_id ? Number(pasta_id) : undefined,
        somente_raiz: somente_raiz === 'true',
        localizacao_id: localizacao_id ? Number(localizacao_id) : undefined
      });

      const docsFiltrados = documentos.filter(doc => canAccessDocument(req, doc));

      res.json({
        data: docsFiltrados,
        meta: {
          page: Number(page),
          per_page: Number(limit),
          total: docsFiltrados.length
        }
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar documentos.' } });
    }
  }

  /**
   * Cria documento com metadados, localizacao fisica e ficheiro opcional.
   */
  static async criar(req: AuthRequest, res: Response) {
    try {
      const {
        title,
        type,
        support,
        classification,
        department_id,
        folder_id,
        localizacao_id,
        numero_caixa,
        condicao,
        notas_condicao,
        data_documento,
        anos_retencao,
        notas
      } = req.body;
      const instituicaoId = req.usuario!.instituicao_id;
      const suporte = normalizeSuporte(support, Boolean(req.file));
      const folderId = folder_id ? Number(folder_id) : undefined;
      const localizacaoId = localizacao_id ? Number(localizacao_id) : undefined;

      if (!title) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Titulo e obrigatorio.' } });
      }

      if ((suporte === 'DIGITAL' || suporte === 'AMBOS') && !folderId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Documentos digitais devem indicar a pasta de destino.' } });
      }

      if ((suporte === 'FISICO' || suporte === 'AMBOS') && !localizacaoId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Documentos fisicos devem indicar a localizacao.' } });
      }

      if (folderId) {
        const pasta = PastaModel.buscarPorId(folderId);
        if (!pasta || pasta.instituicao_id !== instituicaoId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pasta nao encontrada.' } });
        }
      }

      if (localizacaoId) {
        const localizacao = LocalizacaoFisicaModel.buscarPorId(localizacaoId);
        if (!localizacao || localizacao.instituicao_id !== instituicaoId) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localizacao fisica nao encontrada.' } });
        }
      }

      const id = DocumentoModel.criar({
        instituicao_id: instituicaoId,
        departamento_id: department_id ? Number(department_id) : undefined,
        pasta_id: folderId,
        titulo: title,
        tipo: type,
        suporte,
        classificacao: classification,
        data_documento,
        anos_retencao: anos_retencao ? Number(anos_retencao) : 5,
        notas,
        created_by: req.usuario!.id
      } as Omit<Documento, 'id' | 'created_at' | 'updated_at'>);

      if (localizacaoId) {
        DocumentoModel.definirLocalizacao({
          documento_id: id,
          localizacao_id: localizacaoId,
          numero_caixa,
          condicao,
          notas_condicao
        });
      }

      if (req.file) {
        FicheiroModel.criar({
          documento_id: id,
          nome_interno: req.file.filename,
          nome_original: req.file.originalname,
          tipo_mime: req.file.mimetype,
          tamanho_bytes: req.file.size,
          created_by: req.usuario!.id
        });
        await indexDocument(await fs.promises.readFile(req.file.path), {
          id,
          name: req.file.originalname,
          ext: path.extname(req.file.originalname),
          instituicao_id: instituicaoId
        });
      }

      res.status(201).json({ data: { id, message: 'Documento registrado com sucesso.' } });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao criar documento.' } });
    }
  }

  /**
   * Busca metadados e versoes de ficheiro de um documento.
   */
  static buscar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const documento = DocumentoModel.buscarPorId(id);

      if (!canAccessDocument(req, documento)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento nao encontrado.' } });
      }

      const ficheiros = FicheiroModel.buscarPorDocumento(id);
      res.json({ data: { ...documento, ficheiros } });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar documento.' } });
    }
  }

  /**
   * Atualiza metadados e, se enviado, cria nova versao do ficheiro digital.
   */
  static async atualizar(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const documento = DocumentoModel.buscarPorId(id);

      if (!canAccessDocument(req, documento)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento nao encontrado.' } });
      }

      const updateData = normalizeUpdatePayload(req.body);
      const sucesso = Object.keys(updateData).length > 0 ? DocumentoModel.atualizar(id, updateData) : true;

      if (req.file) {
        FicheiroModel.criar({
          documento_id: id,
          nome_interno: req.file.filename,
          nome_original: req.file.originalname,
          tipo_mime: req.file.mimetype,
          tamanho_bytes: req.file.size,
          created_by: req.usuario!.id
        });
        await indexDocument(await fs.promises.readFile(req.file.path), {
          id,
          name: req.file.originalname,
          ext: path.extname(req.file.originalname),
          instituicao_id: documento.instituicao_id
        });
      }

      if ('localizacao_id' in req.body || 'numero_caixa' in req.body || 'condicao' in req.body || 'notas_condicao' in req.body) {
        const localizacaoId = req.body.localizacao_id ? Number(req.body.localizacao_id) : documento.localizacao_id;
        if (localizacaoId) {
          const localizacao = LocalizacaoFisicaModel.buscarPorId(localizacaoId);
          if (!localizacao || localizacao.instituicao_id !== req.usuario!.instituicao_id) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localizacao fisica nao encontrada.' } });
          }
          DocumentoModel.definirLocalizacao({
            documento_id: id,
            localizacao_id: localizacaoId,
            numero_caixa: req.body.numero_caixa || documento.numero_caixa,
            condicao: req.body.condicao || documento.condicao,
            notas_condicao: req.body.notas_condicao
          });
        }
      }

      if (!sucesso) {
        return res.status(400).json({ error: { code: 'UPDATE_FAILED', message: 'Nenhuma alteracao realizada.' } });
      }

      res.json({ data: { message: 'Documento atualizado com sucesso.' } });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar documento.' } });
    }
  }

  /**
   * Abre o ficheiro mais recente em modo inline, sem Content-Disposition de download.
   */
  static ficheiro(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const documento = DocumentoModel.buscarPorId(id);

      if (!canAccessDocument(req, documento)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento nao encontrado.' } });
      }

      const ficheiro = getLatestFile(id);
      if (!ficheiro) {
        return res.status(404).json({ error: { code: 'NO_FILE', message: 'Documento sem ficheiro digital.' } });
      }

      const filePath = resolveUploadPath(ficheiro.nome_interno);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: { code: 'NO_FILE', message: 'Ficheiro nao encontrado no armazenamento.' } });
      }

      res.setHeader('Content-Type', ficheiro.tipo_mime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${sanitizeHeaderFilename(ficheiro.nome_original)}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(filePath);
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao abrir ficheiro.' } });
    }
  }

  /**
   * Extrai texto do ficheiro mais recente para leitura segura sem download.
   */
  static async texto(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const documento = DocumentoModel.buscarPorId(id);

      if (!canAccessDocument(req, documento)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento nao encontrado.' } });
      }

      const ficheiro = getLatestFile(id);
      if (!ficheiro) {
        return res.status(404).json({ error: { code: 'NO_FILE', message: 'Documento sem ficheiro digital.' } });
      }

      const file = await fs.promises.readFile(resolveUploadPath(ficheiro.nome_interno));
      const ext = path.extname(ficheiro.nome_original).toLowerCase().replace('.', '');
      const extraction = ext === 'pdf'
        ? await extractPdf(file)
        : ['png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp', 'webp'].includes(ext)
          ? await extractOcr(file)
          : await extractText(file, ext);
      const normalized = normalizeText(extraction.text);

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        data: {
          text: normalized.cleanText,
          paragraphs: normalized.paragraphs,
          wordCount: extraction.wordCount,
          pages: extraction.pages || 1
        }
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao ler documento.' } });
    }
  }

  /**
   * Envia documento para a reciclagem.
   */
  static excluir(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const documento = DocumentoModel.buscarPorId(id);

      if (!canAccessDocument(req, documento)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento nao encontrado.' } });
      }

      const sucesso = DocumentoModel.softDelete(id, req.usuario!.id);
      if (sucesso) {
        res.json({ data: { message: 'Documento enviado para a reciclagem.' } });
      } else {
        res.status(400).json({ error: { code: 'DELETE_FAILED', message: 'Nao foi possivel excluir o documento.' } });
      }
    } catch (error: any) {
      if (error.message === 'DOCUMENT_HAS_ACTIVE_LOAN') {
        return res.status(409).json({ error: { code: 'CONFLICT', message: 'Documento com emprestimo ativo nao pode ser eliminado.' } });
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao excluir documento.' } });
    }
  }

  /**
   * Estatisticas de documentos.
   */
  static stats(req: AuthRequest, res: Response) {
    try {
      const stats = DocumentoModel.getStats(req.usuario!.instituicao_id);
      res.json({ data: stats });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao obter estatisticas.' } });
    }
  }
}

function normalizeSuporte(support: string | undefined, hasFile: boolean): 'DIGITAL' | 'FISICO' | 'AMBOS' {
  if (support === 'HIBRIDO') return 'AMBOS';
  if (support === 'AMBOS' || support === 'FISICO' || support === 'DIGITAL') return support;
  return hasFile ? 'DIGITAL' : 'FISICO';
}

function normalizeUpdatePayload(body: any): Partial<Documento> {
  const payload: Partial<Documento> = {};
  if ('title' in body || 'titulo' in body) payload.titulo = body.title || body.titulo;
  if ('type' in body || 'tipo' in body) payload.tipo = body.type || body.tipo;
  if ('support' in body || 'suporte' in body) payload.suporte = normalizeSuporte(body.support || body.suporte, false);
  if ('classification' in body || 'classificacao' in body) payload.classificacao = body.classification || body.classificacao;
  if ('folder_id' in body || 'pasta_id' in body) payload.pasta_id = body.folder_id || body.pasta_id ? Number(body.folder_id || body.pasta_id) : null as any;
  if ('department_id' in body || 'departamento_id' in body) payload.departamento_id = body.department_id || body.departamento_id ? Number(body.department_id || body.departamento_id) : null as any;
  if ('data_documento' in body) payload.data_documento = body.data_documento;
  if ('anos_retencao' in body) payload.anos_retencao = Number(body.anos_retencao);
  if ('notas' in body || 'descricao' in body) payload.notas = body.notas || body.descricao;
  return payload;
}

function canAccessDocument(req: AuthRequest, documento: Documento | null): documento is Documento {
  if (!documento || documento.instituicao_id !== req.usuario!.instituicao_id) return false;
  if (documento.classificacao === 'CONFIDENCIAL' && !req.usuario!.permissoes.includes('docs.confidential')) return false;
  if (documento.classificacao === 'SECRETO' && !req.usuario!.permissoes.includes('docs.secret')) return false;
  return true;
}

function getLatestFile(documentoId: number): { nome_interno: string; nome_original: string; tipo_mime: string } | null {
  const ficheiros = FicheiroModel.buscarPorDocumento(documentoId) as Array<{ nome_interno: string; nome_original: string; tipo_mime: string }>;
  return ficheiros[0] || null;
}

function resolveUploadPath(filename: string): string {
  return path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads', filename);
}

function sanitizeHeaderFilename(filename: string): string {
  return filename.replace(/["\r\n]/g, '_');
}
