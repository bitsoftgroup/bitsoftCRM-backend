import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { courseCreateSchema, courseUpdateSchema } from '../validation/schemas.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const includeInactive = req.query.includeDeleted === 'true' || req.query.deleted === 'true'
    const courses = await prisma.course.findMany({
      where: { educationCenterId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    })
    res.json(courses)
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findFirstOrThrow({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.json(course)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = courseCreateSchema.parse(req.body)
    const course = await prisma.course.create({
      data: { ...data, educationCenterId: req.user!.educationCenterId, isActive: true },
    })
    res.status(201).json(course)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = courseUpdateSchema.parse(req.body)
    const course = await prisma.course.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data,
    })
    res.json(course)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data: { isActive: false },
    })
    res.json(course)
  }),
)

export default router
