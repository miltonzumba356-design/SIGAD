/**
 * Middleware de Validacao
 *
 * Valida dados de entrada nas requisicoes usando express-validator
 * Garante que os dados estao no formato correto antes de processar
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param, query } from 'express-validator';

/**
 * Middleware que verifica se ha erros de validacao
 * Deve ser usado apos os validators do express-validator
 *
 * @param req - Request do Express
 * @param res - Response do Express
 * @param next - Funcao para proximo middleware
 */
export function validarResultado(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const erros = validationResult(req);

  if (!erros.isEmpty()) {
    res.status(400).json({
      sucesso: false,
      mensagem: 'Dados invalidos',
      erros: erros.array()
    });
    return;
  }

  next();
}

/**
 * Validadores para criacao de documentos
 *
 * Campos obrigatorios:
 * - instituicao_id: ID da instituicao (numero)
 * - pasta_id: ID da pasta (numero)
 * - codigo_referencia: Codigo unico do documento
 * - titulo: Titulo do documento (min 3 caracteres)
 * - nivel_confidencialidade_id: Nivel de confidencialidade
 * - created_by: ID do usuario criador
 */
export const validarCriacaoDocumento = [
  body('instituicao_id')
    .isInt({ min: 1 })
    .withMessage('instituicao_id deve ser um numero inteiro positivo'),

  body('pasta_id')
    .isInt({ min: 1 })
    .withMessage('pasta_id deve ser um numero inteiro positivo'),

  body('codigo_referencia')
    .trim()
    .notEmpty()
    .withMessage('codigo_referencia e obrigatorio')
    .isLength({ max: 100 })
    .withMessage('codigo_referencia deve ter no maximo 100 caracteres'),

  body('titulo')
    .trim()
    .notEmpty()
    .withMessage('titulo e obrigatorio')
    .isLength({ min: 3, max: 500 })
    .withMessage('titulo deve ter entre 3 e 500 caracteres'),

  body('nivel_confidencialidade_id')
    .isInt({ min: 1 })
    .withMessage('nivel_confidencialidade_id deve ser um numero inteiro positivo'),

  body('created_by')
    .isInt({ min: 1 })
    .withMessage('created_by deve ser um numero inteiro positivo'),

  validarResultado
];

/**
 * Validadores para criacao de emprestimos
 *
 * Campos obrigatorios:
 * - documento_id: ID do documento
 * - usuario_id: ID do usuario solicitante
 * - data_devolucao_prevista: Data de devolucao (formato YYYY-MM-DD)
 */
export const validarCriacaoEmprestimo = [
  body('documento_id')
    .isInt({ min: 1 })
    .withMessage('documento_id deve ser um numero inteiro positivo'),

  body('usuario_id')
    .isInt({ min: 1 })
    .withMessage('usuario_id deve ser um numero inteiro positivo'),

  body('data_devolucao_prevista')
    .isISO8601()
    .withMessage('data_devolucao_prevista deve estar no formato YYYY-MM-DD'),

  validarResultado
];

/**
 * Validadores para criacao de usuarios
 *
 * Campos obrigatorios:
 * - instituicao_id: ID da instituicao
 * - nome: Nome completo (min 3 caracteres)
 * - email: Email valido e unico
 * - senha: Senha forte (min 6 caracteres)
 */
export const validarCriacaoUsuario = [
  body('instituicao_id')
    .isInt({ min: 1 })
    .withMessage('instituicao_id deve ser um numero inteiro positivo'),

  body('nome')
    .trim()
    .notEmpty()
    .withMessage('nome e obrigatorio')
    .isLength({ min: 3, max: 255 })
    .withMessage('nome deve ter entre 3 e 255 caracteres'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('email invalido')
    .normalizeEmail(),

  body('senha')
    .isLength({ min: 6 })
    .withMessage('senha deve ter no minimo 6 caracteres'),

  validarResultado
];

/**
 * Validadores para login
 *
 * Campos obrigatorios:
 * - email: Email do usuario
 * - senha: Senha do usuario
 */
export const validarLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('email invalido')
    .normalizeEmail(),

  body('senha')
    .notEmpty()
    .withMessage('senha e obrigatoria'),

  validarResultado
];

/**
 * Validador para parametros ID na URL
 *
 * Garante que o ID e um numero inteiro positivo
 */
export const validarId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID deve ser um numero inteiro positivo'),

  validarResultado
];

/**
 * Validadores para paginacao
 *
 * Query params opcionais:
 * - page: Numero da pagina (default: 1)
 * - limit: Itens por pagina (default: 10, max: 100)
 */
export const validarPaginacao = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page deve ser um numero inteiro positivo'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit deve estar entre 1 e 100'),

  validarResultado
];
