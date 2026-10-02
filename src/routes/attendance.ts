import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as attendanceController from '../controllers/attendanceController.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception', 'teacher'))

router.get('/', attendanceController.list)
router.put('/', attendanceController.upsert)

export default router
