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

async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      discounts: { 2: 10, 3: 15, 4: 20 },
      holidays: [],
      rooms: [],
      contractInfo: {
        centerName: 'BitSoft',
        directorName: '',
        address: '',
        phone: '',
        graceDays: 5,
      },
      cashOpeningBalance: 0,
    },
    update: {},
  })
}

router.get(
  '/discounts',
  asyncHandler(async (_req, res) => res.json((await getSettings()).discounts)),
)
router.put(
  '/discounts',
  asyncHandler(async (req, res) => {
    const discounts = discountsSchema.parse(req.body)
    await getSettings()
    const settings = await prisma.settings.update({ where: { id: 'singleton' }, data: { discounts } })
    res.json(settings.discounts)
  }),
)

router.get(
  '/holidays',
  asyncHandler(async (_req, res) => res.json((await getSettings()).holidays)),
)
router.put(
  '/holidays',
  asyncHandler(async (req, res) => {
    const holidays = holidaysSchema.parse(req.body)
    await getSettings()
    const settings = await prisma.settings.update({ where: { id: 'singleton' }, data: { holidays } })
    res.json(settings.holidays)
  }),
)

router.get(
  '/rooms',
  asyncHandler(async (_req, res) => res.json((await getSettings()).rooms)),
)
router.put(
  '/rooms',
  asyncHandler(async (req, res) => {
    const rooms = roomsSchema.parse(req.body)
    await getSettings()
    const settings = await prisma.settings.update({ where: { id: 'singleton' }, data: { rooms } })
    res.json(settings.rooms)
  }),
)

router.get(
  '/contract-info',
  asyncHandler(async (_req, res) => res.json((await getSettings()).contractInfo)),
)
router.put(
  '/contract-info',
  asyncHandler(async (req, res) => {
    const contractInfo = contractInfoSchema.parse(req.body)
    await getSettings()
    const settings = await prisma.settings.update({ where: { id: 'singleton' }, data: { contractInfo } })
    res.json(settings.contractInfo)
  }),
)

router.get(
  '/cash-opening-balance',
  asyncHandler(async (_req, res) => res.json({ amount: Number((await getSettings()).cashOpeningBalance) })),
)
router.put(
  '/cash-opening-balance',
  asyncHandler(async (req, res) => {
    const { amount } = cashOpeningBalanceSchema.parse(req.body)
    await getSettings()
    const settings = await prisma.settings.update({ where: { id: 'singleton' }, data: { cashOpeningBalance: amount } })
    res.json({ amount: Number(settings.cashOpeningBalance) })
  }),
)

export default router
