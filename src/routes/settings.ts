import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  discountsSchema,
  holidaysSchema,
  roomsSchema,
  contractInfoSchema,
  cashOpeningBalanceSchema,
} from '../validation/schemas.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

async function getSettings(educationCenterId: string) {
  const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id: educationCenterId } })
  return prisma.settings.upsert({
    where: { educationCenterId },
    create: {
      educationCenterId,
      discounts: { 2: 10, 3: 15, 4: 20 },
      holidays: [],
      rooms: [],
      contractInfo: {
        centerName: center.name,
        directorName: '',
        address: '',
        phone: center.contactPhone ?? '',
        graceDays: 5,
      },
      cashOpeningBalance: 0,
    },
    update: {},
  })
}

router.get(
  '/discounts',
  asyncHandler(async (req, res) => res.json((await getSettings(req.user!.educationCenterId)).discounts)),
)
router.put(
  '/discounts',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const discounts = discountsSchema.parse(req.body)
    await getSettings(educationCenterId)
    const settings = await prisma.settings.update({ where: { educationCenterId }, data: { discounts } })
    res.json(settings.discounts)
  }),
)

router.get(
  '/holidays',
  asyncHandler(async (req, res) => res.json((await getSettings(req.user!.educationCenterId)).holidays)),
)
router.put(
  '/holidays',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const holidays = holidaysSchema.parse(req.body)
    await getSettings(educationCenterId)
    const settings = await prisma.settings.update({ where: { educationCenterId }, data: { holidays } })
    res.json(settings.holidays)
  }),
)

router.get(
  '/rooms',
  asyncHandler(async (req, res) => res.json((await getSettings(req.user!.educationCenterId)).rooms)),
)
router.put(
  '/rooms',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const rooms = roomsSchema.parse(req.body)
    await getSettings(educationCenterId)
    const settings = await prisma.settings.update({ where: { educationCenterId }, data: { rooms } })
    res.json(settings.rooms)
  }),
)

router.get(
  '/contract-info',
  asyncHandler(async (req, res) => res.json((await getSettings(req.user!.educationCenterId)).contractInfo)),
)
router.put(
  '/contract-info',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const contractInfo = contractInfoSchema.parse(req.body)
    await getSettings(educationCenterId)
    const settings = await prisma.settings.update({ where: { educationCenterId }, data: { contractInfo } })
    res.json(settings.contractInfo)
  }),
)

router.get(
  '/cash-opening-balance',
  asyncHandler(async (req, res) =>
    res.json({ amount: Number((await getSettings(req.user!.educationCenterId)).cashOpeningBalance) }),
  ),
)
router.put(
  '/cash-opening-balance',
  asyncHandler(async (req, res) => {
    const educationCenterId = req.user!.educationCenterId
    const { amount } = cashOpeningBalanceSchema.parse(req.body)
    await getSettings(educationCenterId)
    const settings = await prisma.settings.update({
      where: { educationCenterId },
      data: { cashOpeningBalance: amount },
    })
    res.json({ amount: Number(settings.cashOpeningBalance) })
  }),
)

export default router
