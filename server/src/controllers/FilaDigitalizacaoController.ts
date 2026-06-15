import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FilaDigitalizacaoModel } from '../models/FilaDigitalizacaoModel';
import { FicheiroModel } from '../models/FicheiroModel';
import { DocumentoModel } from '../models/DocumentoModel';
import { LocalizacaoFisicaModel } from '../models/LocalizacaoFisicaModel';
import { AuthRequest } from '../middleware/auth';
import { buildIndexedDocument, indexDocument, saveIndexedDocument } from '../search/documentIndexer';
import { findDuplicateDocument } from '../search/duplicateDetector';
import { listWindowsWiaScanners, scanFromDevice } from '../services/scannerService';
import { getDatabase } from '../config/database';
import type { IndexedDocument } from '../search/searchTypes';

export class FilaDigitalizacaoController {
  /**
   * GET /digitization
   */
  static listar(req: AuthRequest, res: Response) {
    try {
      const instituicaoId = req.usuario!.instituicao_id;
      const { status, type } = req.query;
      const fila = FilaDigitalizacaoModel.listarPorInstituicao(instituicaoId, {
        estado: status as string | undefined,
        tipo_fila: type === 'physical' || type === 'FISICA' ? 'FISICA' : type === 'digital' || type === 'DIGITAL' ? 'DIGITAL' : undefined
      });
      res.json({ data: fila });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar fila.' } });
    }
  }

  /**
   * POST /digitization
   */
  static adicionar(req: AuthRequest, res: Response) {
    try {
      const {
        document_id,
        documento_id,
        priority,
        prioridade,
        notes,
        notas,
        queue_type,
        tipo_fila,
        localizacao_id,
        numero_caixa,
        condicao
      } = req.body;
      const documentId = Number(document_id || documento_id);

      if (!documentId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Documento e obrigatorio.' } });
      }

      const documento = DocumentoModel.buscarPorId(documentId);
      if (!documento || documento.instituicao_id !== req.usuario!.instituicao_id) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento nao encontrado.' } });
      }

      const tipoFila = queue_type === 'FISICA' || tipo_fila === 'FISICA' || documento.suporte === 'FISICO' ? 'FISICA' : 'DIGITAL';
      const localizacaoId = localizacao_id ? Number(localizacao_id) : documento.localizacao_id;
      if (tipoFila === 'FISICA' && !localizacaoId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Fila fisica exige localizacao fisica.' } });
      }

      if (localizacaoId) {
        const localizacao = LocalizacaoFisicaModel.buscarPorId(localizacaoId);
        if (!localizacao || localizacao.instituicao_id !== req.usuario!.instituicao_id) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localizacao fisica nao encontrada.' } });
        }
      }

      const id = FilaDigitalizacaoModel.adicionar({
        instituicao_id: req.usuario!.instituicao_id,
        documento_id: documentId,
        solicitado_por: req.usuario!.id,
        prioridade: priority || prioridade,
        notas: notes || notas,
        tipo_fila: tipoFila,
        localizacao_id: localizacaoId,
        numero_caixa: numero_caixa || documento.numero_caixa,
        condicao: condicao || documento.condicao
      });

      res.status(201).json({ data: { id, message: 'Documento adicionado a fila de digitalizacao.' } });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao adicionar a fila.' } });
    }
  }

  /**
   * PATCH /digitization/{id}/assume
   */
  static assumir(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const sucesso = FilaDigitalizacaoModel.assumir(id, req.usuario!.instituicao_id, req.usuario!.id);

      if (sucesso) {
        res.json({ data: { message: 'Tarefa assumida com sucesso.' } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item nao encontrado ou ja em progresso.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao assumir tarefa.' } });
    }
  }

  /**
   * PATCH /digitization/{id}/complete
   */
  static concluir(req: AuthRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const { ocr_text } = req.body;

      const resultado = FilaDigitalizacaoModel.concluir(id, req.usuario!.instituicao_id, {
        ocr_text: ocr_text
      });

      if (resultado.sucesso && resultado.documento_id) {
        if (req.file) {
          FicheiroModel.criar({
            documento_id: resultado.documento_id,
            nome_interno: req.file.filename,
            nome_original: req.file.originalname,
            tipo_mime: req.file.mimetype,
            tamanho_bytes: req.file.size,
            created_by: req.usuario!.id
          });

          const filePath = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads', req.file.filename);
          fs.promises.readFile(filePath)
            .then(buffer => indexDocument(buffer, {
              id: resultado.documento_id!,
              name: req.file!.originalname,
              ext: path.extname(req.file!.originalname),
              instituicao_id: req.usuario!.instituicao_id
            }))
            .catch(() => undefined);
        }

        res.json({ data: { message: 'Digitalizacao concluida com sucesso.' } });
      } else {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item nao encontrado.' } });
      }
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao concluir tarefa.' } });
    }
  }

  /**
   * POST /digitization/scan
   */
  static async digitalizarScanner(req: AuthRequest, res: Response) {
    try {
      const {
        scanner_ip,
        title,
        type,
        support,
        classification,
        folder_id,
        localizacao_id,
        numero_caixa,
        condicao,
        data_documento,
        notas
      } = req.body;

      if (!scanner_ip || !title) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'IP do scanner e titulo sao obrigatorios.' } });
      }

      const suporte = support === 'DIGITAL' || support === 'AMBOS' ? support : 'AMBOS';
      const localizacaoId = localizacao_id ? Number(localizacao_id) : undefined;

      if ((suporte === 'AMBOS') && !localizacaoId) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Documento hibrido deve indicar localizacao fisica.' } });
      }

      if (localizacaoId) {
        const localizacao = LocalizacaoFisicaModel.buscarPorId(localizacaoId);
        if (!localizacao || localizacao.instituicao_id !== req.usuario!.instituicao_id) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Localizacao fisica nao encontrada.' } });
        }
      }

      const scanned = await scanFromDevice(scanner_ip);
      const filename = `${uuidv4()}${scanned.extension}`;
      const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads');
      await fs.promises.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, scanned.buffer);

      const metadata = {
        pasta_id: folder_id ? Number(folder_id) : undefined,
        titulo: title,
        tipo: type,
        suporte,
        classificacao: classification || 'PUBLICO',
        data_documento,
        anos_retencao: 5,
        notas,
        localizacao_id: localizacaoId,
        numero_caixa,
        condicao: condicao || 'GOOD'
      };

      const indexed = await buildIndexedDocument(scanned.buffer, {
        id: `pending-${filename}`,
        name: title,
        ext: scanned.extension,
        instituicao_id: req.usuario!.instituicao_id
      });

      const duplicate = findDuplicateDocument(indexed, req.usuario!.instituicao_id, 98);
      if (duplicate) {
        const pendingId = uuidv4();
        getDatabase().prepare(`
          INSERT INTO digitalizacoes_pendentes (
            id, instituicao_id, solicitado_por, nome_interno, nome_original,
            tipo_mime, tamanho_bytes, extensao, metadata_json, indexed_json,
            duplicate_doc_id, similarity
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          pendingId,
          req.usuario!.instituicao_id,
          req.usuario!.id,
          filename,
          `${title}${scanned.extension}`,
          scanned.mimeType,
          scanned.buffer.length,
          scanned.extension,
          JSON.stringify(metadata),
          JSON.stringify(indexed),
          Number(duplicate.docId),
          duplicate.similarity
        );

        return res.json({
          data: {
            duplicate: true,
            pending_id: pendingId,
            similarity: Math.round(duplicate.similarity * 100) / 100,
            existing_document: duplicate.data,
            scanned_document: {
              title,
              type,
              support: suporte,
              classification: classification || 'PUBLICO',
              wordCount: indexed.wordCount
            },
            message: 'Possivel documento duplicado encontrado.'
          }
        });
      }

      const documentId = DocumentoModel.criar({
        instituicao_id: req.usuario!.instituicao_id,
        departamento_id: undefined,
        pasta_id: metadata.pasta_id,
        titulo: metadata.titulo,
        tipo: metadata.tipo,
        suporte: metadata.suporte,
        classificacao: metadata.classificacao,
        data_documento: metadata.data_documento,
        anos_retencao: metadata.anos_retencao,
        notas: metadata.notas,
        created_by: req.usuario!.id
      } as any);

      if (localizacaoId) {
        DocumentoModel.definirLocalizacao({
          documento_id: documentId,
          localizacao_id: localizacaoId,
          numero_caixa: metadata.numero_caixa,
          condicao: metadata.condicao
        });
      }

      FicheiroModel.criar({
        documento_id: documentId,
        nome_interno: filename,
        nome_original: `${title}${scanned.extension}`,
        tipo_mime: scanned.mimeType,
        tamanho_bytes: scanned.buffer.length,
        created_by: req.usuario!.id
      });

      const savedIndex = await indexDocument(scanned.buffer, {
        id: documentId,
        name: title,
        ext: scanned.extension,
        instituicao_id: req.usuario!.instituicao_id
      });

      res.status(201).json({
        data: {
          document_id: documentId,
          docType: savedIndex.type,
          wordCount: savedIndex.wordCount,
          message: 'Documento digitalizado e indexado com sucesso.'
        }
      });
    } catch (error: any) {
      res.status(502).json({
        error: {
          code: 'SCANNER_UNAVAILABLE',
          message: 'Nao foi possivel acionar o scanner. Confirme o IP, se o equipamento suporta eSCL/AirScan e se esta na mesma rede.'
        }
      });
    }
  }

  /**
   * POST /digitization/scan/{pendingId}/resolve
   */
  static resolverDuplicidade(req: AuthRequest, res: Response) {
    try {
      const pendingId = req.params.pendingId;
      const action = String(req.body.action || '').toUpperCase();
      if (!['KEEP', 'SUBSTITUTE', 'IGNORE'].includes(action)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Acao invalida.' } });
      }

      const db = getDatabase();
      const pending = db.prepare(`
        SELECT *
        FROM digitalizacoes_pendentes
        WHERE id = ? AND instituicao_id = ?
      `).get(pendingId, req.usuario!.instituicao_id) as PendingDigitization | undefined;

      if (!pending) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Digitalizacao pendente nao encontrada.' } });
      }

      const filePath = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads', pending.nome_interno);

      if (action === 'IGNORE') {
        removePendingFile(filePath);
        deletePendingDigitization(pending.id);
        return res.json({ data: { ignored: true, message: 'Digitalizacao ignorada.' } });
      }

      const metadata = JSON.parse(pending.metadata_json) as PendingMetadata;
      const indexed = JSON.parse(pending.indexed_json) as IndexedDocument;
      const targetDocumentId = action === 'SUBSTITUTE'
        ? Number(pending.duplicate_doc_id)
        : createDocumentFromPending(metadata, req.usuario!.instituicao_id, req.usuario!.id);

      if (!targetDocumentId) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento original nao encontrado para substituicao.' } });
      }

      if (action === 'SUBSTITUTE') {
        const existing = DocumentoModel.buscarPorId(targetDocumentId);
        if (!existing || existing.instituicao_id !== req.usuario!.instituicao_id) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Documento original nao encontrado.' } });
        }
        DocumentoModel.atualizar(targetDocumentId, {
          pasta_id: metadata.pasta_id,
          titulo: metadata.titulo,
          tipo: metadata.tipo,
          suporte: metadata.suporte,
          classificacao: metadata.classificacao,
          data_documento: metadata.data_documento,
          anos_retencao: metadata.anos_retencao,
          notas: metadata.notas
        } as any);
        if (metadata.localizacao_id) {
          DocumentoModel.definirLocalizacao({
            documento_id: targetDocumentId,
            localizacao_id: metadata.localizacao_id,
            numero_caixa: metadata.numero_caixa,
            condicao: metadata.condicao
          });
        }
      }

      FicheiroModel.criar({
        documento_id: targetDocumentId,
        nome_interno: pending.nome_interno,
        nome_original: pending.nome_original,
        tipo_mime: pending.tipo_mime,
        tamanho_bytes: pending.tamanho_bytes,
        created_by: req.usuario!.id
      });

      saveIndexedDocument({
        ...indexed,
        id: String(targetDocumentId),
        name: metadata.titulo,
        indexedAt: new Date().toISOString(),
        instituicao_id: req.usuario!.instituicao_id
      } as IndexedDocument & { instituicao_id?: number });

      deletePendingDigitization(pending.id);
      res.json({
        data: {
          document_id: targetDocumentId,
          action,
          message: action === 'SUBSTITUTE' ? 'Documento substituido com sucesso.' : 'Documento mantido como novo registo.'
        }
      });
    } catch {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao resolver duplicidade.' } });
    }
  }

  /**
   * GET /digitization/scanners
   */
  static async scanners(req: AuthRequest, res: Response) {
    try {
      const scanners = await listWindowsWiaScanners();
      res.json({ data: scanners });
    } catch {
      res.json({ data: [] });
    }
  }
}

interface PendingDigitization {
  id: string;
  instituicao_id: number;
  solicitado_por: number;
  nome_interno: string;
  nome_original: string;
  tipo_mime: string;
  tamanho_bytes: number;
  extensao: string;
  metadata_json: string;
  indexed_json: string;
  duplicate_doc_id?: number;
  similarity?: number;
}

interface PendingMetadata {
  pasta_id?: number;
  titulo: string;
  tipo?: string;
  suporte: 'DIGITAL' | 'AMBOS';
  classificacao: 'PUBLICO' | 'RESTRITO' | 'CONFIDENCIAL' | 'SECRETO';
  data_documento?: string;
  anos_retencao: number;
  notas?: string;
  localizacao_id?: number;
  numero_caixa?: string;
  condicao?: 'GOOD' | 'FAIR' | 'DETERIORATED';
}

function createDocumentFromPending(metadata: PendingMetadata, instituicaoId: number, userId: number): number {
  const documentId = DocumentoModel.criar({
    instituicao_id: instituicaoId,
    departamento_id: undefined,
    pasta_id: metadata.pasta_id,
    titulo: metadata.titulo,
    tipo: metadata.tipo,
    suporte: metadata.suporte,
    classificacao: metadata.classificacao,
    data_documento: metadata.data_documento,
    anos_retencao: metadata.anos_retencao,
    notas: metadata.notas,
    created_by: userId
  } as any);

  if (metadata.localizacao_id) {
    DocumentoModel.definirLocalizacao({
      documento_id: documentId,
      localizacao_id: metadata.localizacao_id,
      numero_caixa: metadata.numero_caixa,
      condicao: metadata.condicao || 'GOOD'
    });
  }

  return documentId;
}

function deletePendingDigitization(id: string): void {
  getDatabase().prepare('DELETE FROM digitalizacoes_pendentes WHERE id = ?').run(id);
}

function removePendingFile(filePath: string): void {
  fs.promises.unlink(filePath).catch(() => undefined);
}
