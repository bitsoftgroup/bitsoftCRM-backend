import { Router } from 'express'
import { prisma } from '../prisma.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { attendanceUpsertSchema } from '../validation/schemas.js'

const router = Router()
router.use(authenticate, requireRole('admin', 'reception', 'teacher'))

/** Verifies the group belongs to the caller's tenant, and (for teachers) to them specifically. */
async function assertOwnsGroup(req: import('express').Request, groupId: string) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, educationCenterId: req.user!.educationCenterId },
  })
  if (!group) return false
  if (req.user!.role !== 'teacher') return true
  return group.teacherId === req.user!.teacherId
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const groupId = String(req.query.groupId ?? '')
    if (!groupId) return res.status(400).json({ error: 'groupId is required' })
    if (!(await assertOwnsGroup(req, groupId))) return res.status(403).json({ error: 'Not your group' })

    const date = req.query.date ? String(req.query.date) : undefined
    const from = req.query.from ? String(req.query.from) : undefined
    const to = req.query.to ? String(req.query.to) : undefined

    const where: Record<string, unknown> = { groupId, educationCenterId: req.user!.educationCenterId }
    if (date) where.date = new Date(date)
    else if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const records = await prisma.attendance.findMany({ where, orderBy: { date: 'asc' } })
    res.json(records)
  }),
)

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { groupId, date, records } = attendanceUpsertSchema.parse(req.body)
    if (!(await assertOwnsGroup(req, groupId))) return res.status(403).json({ error: 'Not your group' })

    const attendance = await prisma.attendance.upsert({
      where: { groupId_date: { groupId, date: new Date(date) } },
      create: { groupId, date: new Date(date), records, educationCenterId: req.user!.educationCenterId },
      update: { records },
    })
    res.json(attendance)
  }),
)

export default router
