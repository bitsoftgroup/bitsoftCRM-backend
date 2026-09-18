import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { teacherCreateSchema, teacherUpdateSchema } from '../validation/schemas.js'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  requireRole('admin', 'reception'),
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const includeInactive = req.query.includeDeleted === 'true' || req.query.deleted === 'true'
    const teachers = await prisma.teacher.findMany({
      where: { educationCenterId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    })
    res.json(teachers)
  }),
)

router.get(
  '/:id',
  requireRole('admin', 'reception'),
  asyncHandler(async (req, res) => {
    const teacher = await prisma.teacher.findFirstOrThrow({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.json(teacher)
  }),
)

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = teacherCreateSchema.parse(req.body)
    const teacher = await prisma.teacher.create({
      data: { ...data, educationCenterId: req.user!.educationCenterId, isActive: true },
    })
    res.status(201).json(teacher)
  }),
)

router.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = teacherUpdateSchema.parse(req.body)
    const teacher = await prisma.teacher.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data,
    })
    res.json(teacher)
  }),
)

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const teacher = await prisma.teacher.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data: { isActive: false },
    })
    res.json(teacher)
  }),
)

export default router
