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
    const educationCenterId = req.user!.educationCenterId
    const where = { educationCenterId, deleted: req.query.deleted === 'true' }
    const payments = await prisma.payment.findMany({ where, orderBy: { paidAt: 'desc' } })
    res.json(payments)
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.findFirstOrThrow({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.json(payment)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = paymentCreateSchema.parse(req.body)
    const payment = await prisma.payment.create({
      data: { ...data, educationCenterId: req.user!.educationCenterId, paidAt: new Date() },
    })
    res.status(201).json(payment)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = paymentUpdateSchema.parse(req.body)
    const payment = await prisma.payment.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data,
    })
    res.json(payment)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const payment = await prisma.payment.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data: { deleted: true },
    })
    res.json(payment)
  }),
)

export default router
