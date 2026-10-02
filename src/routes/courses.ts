import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as coursesController from '../controllers/coursesController.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

router.get('/', coursesController.list)
router.get('/:id', coursesController.getOne)
router.post('/', coursesController.create)
router.patch('/:id', coursesController.update)
router.delete('/:id', coursesController.remove)

export default router
