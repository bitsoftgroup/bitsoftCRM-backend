import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as cashExpensesController from '../controllers/cashExpensesController.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

router.get('/', cashExpensesController.list)
router.get('/:id', cashExpensesController.getOne)
router.post('/', cashExpensesController.create)
router.patch('/:id', cashExpensesController.update)
router.delete('/:id', cashExpensesController.remove)
router.post('/:id/restore', cashExpensesController.restore)
router.delete('/:id/permanent', cashExpensesController.removePermanently)

export default router
