import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { groupCreateSchema, groupUpdateSchema } from '../validation/schemas.js'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeDeleted === 'true' || req.query.deleted === 'true'
    const where = req.user!.role === 'teacher' ? { teacherId: req.user!.teacherId! } : includeInactive ? {} : { isActive: true }
    const groups = await prisma.group.findMany({ where, orderBy: { name: 'asc' } })
    res.json(groups)
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const group = await prisma.group.findUniqueOrThrow({ where: { id: req.params.id } })
    if (req.user!.role === 'teacher' && group.teacherId !== req.user!.teacherId) {
      return res.status(403).json({ error: 'Not your group' })
    }
    res.json(group)
  }),
)

router.post(
  '/',
  requireRole('admin', 'reception'),
  asyncHandler(async (req, res) => {
    const data = groupCreateSchema.parse(req.body)
    const group = await prisma.group.create({ data: { ...data, isActive: true } })
    res.status(201).json(group)
  }),
)

router.patch(
  '/:id',
  requireRole('admin', 'reception'),
  asyncHandler(async (req, res) => {
    const data = groupUpdateSchema.parse(req.body)
    const group = await prisma.group.update({ where: { id: req.params.id }, data })
    res.json(group)
  }),
)

router.delete(
  '/:id',
  requireRole('admin', 'reception'),
  asyncHandler(async (req, res) => {
    const group = await prisma.group.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json(group)
  }),
)

export default router
