import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { paymentCreateSchema, paymentUpdateSchema } from '../validation/schemas.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = req.query.deleted === 'true' ? { deleted: true } : { deleted: false }
    const payments = await prisma.payment.findMany({ where, orderBy: { paidAt: 'desc' } })
    res.json(payments)
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: req.params.id } })
    res.json(payment)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = paymentCreateSchema.parse(req.body)
    const payment = await prisma.payment.create({ data: { ...data, paidAt: new Date() } })
    res.status(201).json(payment)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = paymentUpdateSchema.parse(req.body)
    const payment = await prisma.payment.update({ where: { id: req.params.id }, data })
    res.json(payment)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.update({ where: { id: req.params.id }, data: { deleted: true } })
    res.json(payment)
  }),
)

export default router
