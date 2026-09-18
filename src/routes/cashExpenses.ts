import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { cashExpenseCreateSchema, cashExpenseUpdateSchema } from '../validation/schemas.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const isDeletedView = req.query.deleted === 'true'
    const expenses = await prisma.cashExpense.findMany({
      where: { educationCenterId, deleted: isDeletedView },
      orderBy: isDeletedView ? { deletedAt: 'desc' } : { date: 'desc' },
    })
    res.json(expenses)
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const expense = await prisma.cashExpense.findFirstOrThrow({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.json(expense)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = cashExpenseCreateSchema.parse(req.body)
    const expense = await prisma.cashExpense.create({
      data: { ...data, educationCenterId: req.user!.educationCenterId },
    })
    res.status(201).json(expense)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = cashExpenseUpdateSchema.parse(req.body)
    const expense = await prisma.cashExpense.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data,
    })
    res.json(expense)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const expense = await prisma.cashExpense.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data: { deleted: true, deletedAt: new Date() },
    })
    res.json(expense)
  }),
)

router.post(
  '/:id/restore',
  asyncHandler(async (req, res) => {
    const expense = await prisma.cashExpense.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data: { deleted: false, deletedAt: null },
    })
    res.json(expense)
  }),
)

router.delete(
  '/:id/permanent',
  asyncHandler(async (req, res) => {
    await prisma.cashExpense.delete({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.status(204).end()
  }),
)

export default router
