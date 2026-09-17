import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { contractCreateSchema, contractUpdateSchema } from '../validation/schemas.js'
import { nextContractNumber } from '../lib/business.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception'))

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const contracts = await prisma.contract.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(contracts)
  }),
)

router.get(
  '/next-number',
  asyncHandler(async (_req, res) => {
    // Peeks the next number without consuming it: current year counter + 1.
    const year = new Date().getFullYear()
    const row = await prisma.contractYearCounter.findUnique({ where: { year } })
    res.json({ contractNumber: `${(row?.counter ?? 0) + 1}/${year}` })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findUniqueOrThrow({ where: { id: req.params.id } })
    res.json(contract)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = contractCreateSchema.parse(req.body)
    const contractNumber = await nextContractNumber()
    const contract = await prisma.contract.create({ data: { ...data, contractNumber } })
    res.status(201).json(contract)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = contractUpdateSchema.parse(req.body)
    const contract = await prisma.contract.update({ where: { id: req.params.id }, data })
    res.json(contract)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.contract.delete({ where: { id: req.params.id } })
    res.status(204).end()
  }),
)

export default router
