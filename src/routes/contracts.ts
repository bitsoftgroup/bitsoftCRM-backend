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
  asyncHandler(async (req, res) => {
    const contracts = await prisma.contract.findMany({
      where: { educationCenterId: req.user!.educationCenterId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(contracts)
  }),
)

router.get(
  '/next-number',
  asyncHandler(async (req, res) => {
    // Peeks the next number without consuming it: current year counter + 1.
    const educationCenterId = req.user!.educationCenterId
    const year = new Date().getFullYear()
    const row = await prisma.contractYearCounter.findUnique({ where: { educationCenterId_year: { educationCenterId, year } } })
    res.json({ contractNumber: `${(row?.counter ?? 0) + 1}/${year}` })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contract = await prisma.contract.findFirstOrThrow({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.json(contract)
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const data = contractCreateSchema.parse(req.body)
    const contractNumber = await nextContractNumber(educationCenterId)

    // Branding fields (name, logo, director, address, phone) are always the tenant's
    // current customization, not whatever the client happens to send (AC-4's "server
    // computes trustworthy values" principle extended to the education center's own
    // identity, per the "everything customizable per center" requirement).
    const [center, settings] = await Promise.all([
      prisma.educationCenter.findUniqueOrThrow({ where: { id: educationCenterId } }),
      prisma.settings.findUnique({ where: { educationCenterId } }),
    ])
    const contractInfo = (settings?.contractInfo as {
      centerName?: string
      directorName?: string
      address?: string
      phone?: string
      graceDays?: number
    }) ?? {}

    const contract = await prisma.contract.create({
      data: {
        ...data,
        educationCenterId,
        contractNumber,
        centerName: contractInfo.centerName ?? center.name,
        centerLogoUrl: center.logoUrl ?? null,
        directorName: contractInfo.directorName || center.ownerName || null,
        address: contractInfo.address ?? null,
        centerPhone: contractInfo.phone ?? center.contactPhone ?? null,
        graceDays: data.graceDays ?? contractInfo.graceDays ?? null,
      },
    })
    res.status(201).json(contract)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = contractUpdateSchema.parse(req.body)
    const contract = await prisma.contract.update({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
      data,
    })
    res.json(contract)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.contract.delete({
      where: { id: req.params.id, educationCenterId: req.user!.educationCenterId },
    })
    res.status(204).end()
  }),
)

export default router
