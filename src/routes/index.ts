import { Router } from 'express'
import { resolveTenant } from '../middleware/tenant.js'
import authRoutes from './auth.js'
import tenantRoutes from './tenant.js'
import studentRoutes from './students.js'
import groupRoutes from './groups.js'
import courseRoutes from './courses.js'
import teacherRoutes from './teachers.js'
import paymentRoutes from './payments.js'
import contractRoutes from './contracts.js'
import cashExpenseRoutes from './cashExpenses.js'
import settingsRoutes from './settings.js'
import attendanceRoutes from './attendance.js'
import reportRoutes from './reports.js'
import studentPortalRoutes from './studentPortal.js'
import superadminRoutes from './superadmin.js'

// Mounted at /api/v1 by app.ts.
const router = Router()

router.get('/health', (_req, res) => res.json({ ok: true }))

// Registered before resolveTenant below: Express matches in registration order, and
// the tenant middleware would otherwise demand a tenant token these routes never carry.
// Superadmin auth uses its own SuperAdmin JWT.
router.use('/superadmin', superadminRoutes)

// Every tenant-facing route requires X-Tenant-Token first.
router.use(resolveTenant)
router.use('/auth', authRoutes)
router.use('/tenant', tenantRoutes)
router.use('/students', studentRoutes)
router.use('/groups', groupRoutes)
router.use('/courses', courseRoutes)
router.use('/teachers', teacherRoutes)
router.use('/payments', paymentRoutes)
router.use('/contracts', contractRoutes)
router.use('/cash-expenses', cashExpenseRoutes)
router.use('/settings', settingsRoutes)
router.use('/attendance', attendanceRoutes)
router.use('/reports', reportRoutes)
router.use('/portal', studentPortalRoutes)

export default router
