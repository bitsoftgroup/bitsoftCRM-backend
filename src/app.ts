import { mkdirSync } from 'fs'
import cors from 'cors'
import express from 'express'
import { pinoHttp } from 'pino-http'
import { logger } from './logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { resolveTenant } from './middleware/tenant.js'
import authRoutes from './routes/auth.js'
import tenantRoutes from './routes/tenant.js'
import studentRoutes from './routes/students.js'
import groupRoutes from './routes/groups.js'
import courseRoutes from './routes/courses.js'
import teacherRoutes from './routes/teachers.js'
import paymentRoutes from './routes/payments.js'
import contractRoutes from './routes/contracts.js'
import cashExpenseRoutes from './routes/cashExpenses.js'
import settingsRoutes from './routes/settings.js'
import attendanceRoutes from './routes/attendance.js'
import reportRoutes from './routes/reports.js'
import superadminRoutes from './routes/superadmin.js'
import studentPortalRoutes from './routes/studentPortal.js'

export const app = express()

app.use(cors())
app.use(express.json())
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
)

app.get('/api/v1/health', (_req, res) => res.json({ ok: true }))

// Mounted before the tenant router below: Express matches path prefixes in registration
// order, and '/api/v1' would otherwise swallow '/api/v1/superadmin/*' first and demand a
// tenant token those routes never carry. Superadmin auth uses its own SuperAdmin JWT.
app.use('/api/v1/superadmin', superadminRoutes)

// Every tenant-facing route requires X-Tenant-Token first.
const tenantRouter = express.Router()
tenantRouter.use(resolveTenant)
tenantRouter.use('/auth', authRoutes)
tenantRouter.use('/tenant', tenantRoutes)
tenantRouter.use('/students', studentRoutes)
tenantRouter.use('/groups', groupRoutes)
tenantRouter.use('/courses', courseRoutes)
tenantRouter.use('/teachers', teacherRoutes)
tenantRouter.use('/payments', paymentRoutes)
tenantRouter.use('/contracts', contractRoutes)
tenantRouter.use('/cash-expenses', cashExpenseRoutes)
tenantRouter.use('/settings', settingsRoutes)
tenantRouter.use('/attendance', attendanceRoutes)
tenantRouter.use('/reports', reportRoutes)
tenantRouter.use('/portal', studentPortalRoutes)
app.use('/api/v1', tenantRouter)

mkdirSync('uploads/logos', { recursive: true })
app.use('/uploads', express.static('uploads'))

app.use(errorHandler)
