import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception', 'teacher'))

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

router.get(
  '/todays-classes',
  asyncHandler(async (req, res) => {
    const today = DAY_NAMES[new Date().getDay()]
    const where =
      req.user!.role === 'teacher'
        ? { teacherId: req.user!.teacherId!, isActive: true, scheduleDays: { has: today } }
        : { isActive: true, scheduleDays: { has: today } }
    const count = await prisma.group.count({ where })
    res.json({ count })
  }),
)

export default router
