import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as studentsController from '../controllers/studentsController.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

router.get('/', studentsController.list)
router.get('/:id', studentsController.getOne)
router.post('/', studentsController.create)
router.patch('/:id', studentsController.update)
router.delete('/:id', studentsController.remove)
router.get('/:id/debt-status', studentsController.debtStatus)
router.post('/:id/restore', studentsController.restore)
router.delete('/:id/permanent', studentsController.removePermanently)
router.post('/:id/groups/:groupId', studentsController.addToGroup)
router.delete('/:id/groups/:groupId', studentsController.removeFromGroup)

export default router
