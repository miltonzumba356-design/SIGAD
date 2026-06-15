import { Router } from 'express';
import { InstituicaoController } from '../controllers/InstituicaoController';
import { DepartamentoController } from '../controllers/DepartamentoController';
import { verificarAutenticacao, temPermissao } from '../middleware/auth';

const router = Router();

router.use(verificarAutenticacao);

const deptRouter = Router();
deptRouter.get('/', DepartamentoController.listar);
deptRouter.post('/', temPermissao('users.edit'), DepartamentoController.criar);
deptRouter.get('/:id', DepartamentoController.buscar);
deptRouter.put('/:id', temPermissao('users.edit'), DepartamentoController.atualizar);
deptRouter.delete('/:id', temPermissao('users.edit'), DepartamentoController.excluir);

router.use('/departments', deptRouter);

router.get('/', temPermissao('sys.institutions'), InstituicaoController.listar);
router.post('/', temPermissao('sys.institutions'), InstituicaoController.criar);
router.get('/:id/stats', temPermissao('sys.institutions'), InstituicaoController.stats);
router.get('/:id', temPermissao('sys.institutions'), InstituicaoController.buscar);
router.put('/:id', temPermissao('sys.institutions'), InstituicaoController.atualizar);
router.delete('/:id', temPermissao('sys.institutions'), InstituicaoController.excluir);

export default router;
