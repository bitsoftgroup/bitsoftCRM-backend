import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as groupsController from '../controllers/groupsController.js'

const router = Router()
router.use(authenticate)

router.get('/', groupsController.list)
router.get('/:id', groupsController.getOne)
router.post('/', requireRole('admin', 'reception'), groupsController.create)
router.patch('/:id', requireRole('admin', 'reception'), groupsController.update)
router.delete('/:id', requireRole('admin', 'reception'), groupsController.remove)

export default router
