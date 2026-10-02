import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as paymentsController from '../controllers/paymentsController.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

router.get('/', paymentsController.list)
router.get('/:id', paymentsController.getOne)
router.post('/', paymentsController.create)
router.patch('/:id', paymentsController.update)
router.delete('/:id', paymentsController.remove)

export default router
