import cors from 'cors'
import express from 'express'
import { pinoHttp } from 'pino-http'
import { logger } from './logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
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

export const app = express()

app.use(cors())
app.use(express.json())
app.use(pinoHttp({ logger }))

app.get('/api/v1/health', (_req, res) => res.json({ ok: true }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/students', studentRoutes)
app.use('/api/v1/groups', groupRoutes)
app.use('/api/v1/courses', courseRoutes)
app.use('/api/v1/teachers', teacherRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/contracts', contractRoutes)
app.use('/api/v1/cash-expenses', cashExpenseRoutes)
app.use('/api/v1/settings', settingsRoutes)
app.use('/api/v1/attendance', attendanceRoutes)
app.use('/api/v1/reports', reportRoutes)

app.use(errorHandler)
