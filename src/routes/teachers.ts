import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as teachersController from '../controllers/teachersController.js'

const router = Router()
router.use(authenticate)

router.get('/', requireRole('admin', 'reception'), teachersController.list)
router.get('/:id', requireRole('admin', 'reception'), teachersController.getOne)
router.post('/', requireRole('admin'), teachersController.create)
router.patch('/:id', requireRole('admin'), teachersController.update)
router.delete('/:id', requireRole('admin'), teachersController.remove)

export default router
