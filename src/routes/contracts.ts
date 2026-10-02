import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as contractsController from '../controllers/contractsController.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

router.get('/', contractsController.list)
router.get('/next-number', contractsController.nextNumber)
router.get('/:id', contractsController.getOne)
router.post('/', contractsController.create)
router.patch('/:id', contractsController.update)
router.delete('/:id', contractsController.remove)

export default router
