import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { studentCreateSchema, studentUpdateSchema, studentDeleteSchema } from '../validation/schemas.js'
import { computeStudentDebtStatus } from '../lib/business.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

function serialize(student: { groups: { groupId: string }[] } & Record<string, unknown>) {
  return { ...student, groupIds: student.groups.map((g) => g.groupId) }
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const includeDeleted = req.query.includeDeleted === 'true' || req.query.deleted === 'true'
    const students = await prisma.student.findMany({
      where: {
        educationCenterId,
        ...(req.query.deleted === 'true' ? { deleted: true } : includeDeleted ? {} : { deleted: false }),
      },
      include: { groups: true },
      orderBy: req.query.deleted === 'true' ? { deletedAt: 'desc' } : { name: 'asc' },
    })
    res.json(students.map(serialize))
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const student = await prisma.student.findFirstOrThrow({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      include: { groups: true },
    })
    res.json(serialize(student))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = studentCreateSchema.parse(req.body)
    const student = await prisma.student.create({
      data: { ...data, educationCenterId: req.user!.educationCenterId },
      include: { groups: true },
    })
    res.status(201).json(serialize(student))
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = studentUpdateSchema.parse(req.body)
    const student = await prisma.student.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data,
      include: { groups: true },
    })
    res.json(serialize(student))
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const extra = studentDeleteSchema.parse(req.body ?? {})
    const student = await prisma.student.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data: { deleted: true, deletedAt: new Date(), ...extra },
    })
    res.json(student)
  }),
)

router.get(
  '/:id/debt-status',
  asyncHandler(async (req, res) => {
    const result = await computeStudentDebtStatus(req.params.id, req.user!.educationCenterId)
    res.json(result)
  }),
)

router.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const student = await prisma.student.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data: { deleted: false, deletedAt: null, deleteNote: null, deleteBalanceType: null, deleteBalanceAmount: null },
    })
    res.json(student)
  }),
)

router.delete(
  '/:id/permanent',
  asyncHandler(async (req, res) => {
    await prisma.student.delete({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.status(204).end()
  }),
)

router.post(
  '/:id/groups/:groupId',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    await prisma.student.findFirstOrThrow({ where: { id: req.params.id, educationCenterId } })
    await prisma.group.findFirstOrThrow({ where: { id: req.params.groupId, educationCenterId } })
    await prisma.studentGroup.upsert({
      where: { studentId_groupId: { studentId: req.params.id, groupId: req.params.groupId } },
      create: { studentId: req.params.id, groupId: req.params.groupId },
      update: {},
    })
    const student = await prisma.student.findUniqueOrThrow({ where: { id: req.params.id }, include: { groups: true } })
    res.json(serialize(student))
  }),
)

router.delete(
  '/:id/groups/:groupId',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    await prisma.student.findFirstOrThrow({ where: { id: req.params.id, educationCenterId } })
    await prisma.studentGroup.delete({
      where: { studentId_groupId: { studentId: req.params.id, groupId: req.params.groupId } },
    })
    const student = await prisma.student.findUniqueOrThrow({ where: { id: req.params.id }, include: { groups: true } })
    res.json(serialize(student))
  }),
)

export default router
