import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'

const router = Router()

const normalizePhone = (phone: unknown) => String(phone ?? '').replace(/\D/g, '').slice(-9)

/**
 * Unauthenticated by design: the student mobile app has no CRM login, so a
 * student/parent is identified by phone number instead of a JWT, mirroring
 * the lookup the app previously did directly against Firebase.
 */
router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const phone = normalizePhone(req.query.phone)
    const parentPhone = normalizePhone(req.query.parentPhone)
    const candidates = [phone, parentPhone].filter(Boolean)
    if (candidates.length === 0) {
      return res.status(400).json({ error: 'phone or parentPhone query param is required' })
    }

    const students = await prisma.student.findMany({ where: { deleted: false } })
    const matches = students.filter((student) => {
      const studentPhone = normalizePhone(student.phone)
      const studentParentPhone = normalizePhone(student.parentPhone)
      return candidates.includes(studentPhone) || candidates.includes(studentParentPhone)
    })

    if (matches.length > 1) {
      return res.status(409).json({ error: 'Multiple students matched this phone number' })
    }
    if (matches.length === 0) {
      return res.json([])
    }

    const payments = await prisma.payment.findMany({
      where: { studentId: matches[0].id, deleted: false },
      orderBy: { paidAt: 'desc' },
    })
    res.json(payments)
  }),
)

export default router
