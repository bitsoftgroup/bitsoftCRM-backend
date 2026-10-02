import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as reportsController from '../controllers/reportsController.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception', 'teacher'))

router.get('/todays-classes', reportsController.todaysClasses)

export default router
