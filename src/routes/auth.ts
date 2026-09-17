import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, signToken } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { loginSchema } from '../validation/schemas.js'

const router = Router()

// NOTE: passwords are stored and compared as plain text, per the engineer's explicit,
// accepted-risk decision in docs/specs/backend/0001-backend-service-architecture/index.md.
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = signToken({ userId: user.id, role: user.role, teacherId: user.teacherId })
    res.json({ token, role: user.role, teacherId: user.teacherId })
  }),
)

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } })
    res.json({ id: user.id, email: user.email, role: user.role, teacherId: user.teacherId })
  }),
)

export default router
