import { Router } from 'express'
import * as recordsController from '../controllers/superadminRecordsController.js'

// Mounted after authenticateSuperAdmin in the superadmin router. These are
// deliberately global, read only lists, including archived data and inactive centers.
const router = Router()

router.get('/students', recordsController.students)
router.get('/payments', recordsController.payments)
router.get('/attendance', recordsController.attendance)
router.get('/teachers', recordsController.teachers)
router.get('/groups', recordsController.groups)
router.get('/courses', recordsController.courses)
router.get('/contracts', recordsController.contracts)
router.get('/cash-expenses', recordsController.cashExpenses)

export default router
