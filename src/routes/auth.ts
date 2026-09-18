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
    const { centerSlug, email, password } = loginSchema.parse(req.body)
    // Prefer the center identified by X-Tenant-Token (the desktop app's path). If the
    // master token was sent without picking a center, that's a caller error. Otherwise
    // (no tenant token at all) fall back to centerSlug for the legacy browser frontend.
    if (req.masterAccess && !req.tenantCenterId) {
      return res.status(400).json({ error: 'X-Education-Center-Id header required when using the master tenant token' })
    }
    const center = req.tenantCenterId
      ? await prisma.educationCenter.findUnique({ where: { id: req.tenantCenterId } })
      : centerSlug
        ? await prisma.educationCenter.findUnique({ where: { slug: centerSlug } })
        : null
    if (!center || !center.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const user = await prisma.user.findUnique({
      where: { educationCenterId_email: { educationCenterId: center.id, email } },
    })
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = signToken({
      userId: user.id,
      educationCenterId: center.id,
      role: user.role,
      teacherId: user.teacherId,
    })
    res.json({ token, role: user.role, teacherId: user.teacherId, educationCenter: { id: center.id, name: center.name, logoUrl: center.logoUrl } })
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
