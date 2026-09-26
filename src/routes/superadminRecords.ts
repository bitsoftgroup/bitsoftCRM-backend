import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'

// Mounted after authenticateSuperAdmin in the superadmin router. These are
// deliberately global, read only lists, including archived data and inactive centers.
const router = Router()
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  educationCenterId: z.string().uuid().optional(),
  q: z.string().trim().max(120).default(''),
})
const centerSelect = { id: true, name: true, slug: true, isActive: true } as const
const identitySelect = { id: true, name: true } as const

router.get('/students', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  const search = { contains: q, mode: 'insensitive' as const }
  const where = {
    educationCenterId,
    ...(q ? { OR: [{ name: search }, { phone: search }, { parentPhone: search }] } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ enrolledAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true, name: true, phone: true, parentPhone: true, status: true,
        enrolledAt: true, deleted: true,
        educationCenter: { select: centerSelect },
        groups: { select: { group: { select: identitySelect } } },
      },
    }),
    prisma.student.count({ where }),
  ])
  res.json({ items, total, page, pageSize })
}))

router.get('/payments', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  const search = { contains: q, mode: 'insensitive' as const }
  const where = {
    educationCenterId,
    ...(q ? { OR: [{ student: { name: search } }, { group: { name: search } }, { month: search }] } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ paidAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true, amount: true, month: true, paidDate: true, paidAt: true,
        method: true, status: true, deleted: true,
        educationCenter: { select: centerSelect },
        student: { select: identitySelect },
        group: { select: identitySelect },
      },
    }),
    prisma.payment.count({ where }),
  ])
  res.json({ items, total, page, pageSize })
}))

router.get('/attendance', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  const search = { contains: q, mode: 'insensitive' as const }
  const where = {
    educationCenterId,
    ...(q ? { group: { OR: [{ name: search }, { course: { name: search } }, { teacher: { name: search } }] } } : {}),
  }
  const [sessions, total] = await prisma.$transaction([
    prisma.attendance.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      select: {
        id: true, date: true, records: true, updatedAt: true,
        educationCenter: { select: centerSelect },
        group: { select: {
          ...identitySelect,
          course: { select: identitySelect },
          teacher: { select: identitySelect },
        } },
      },
    }),
    prisma.attendance.count({ where }),
  ])

  // Resolve historical attendance by its saved student IDs, including students
  // who have left the group or been archived since that lesson.
  const entries = sessions.map((session) =>
    Object.entries((session.records ?? {}) as Record<string, unknown>),
  )
  const studentIds = [...new Set(entries.flatMap((records) => records.map(([id]) => id)))]
  const students = studentIds.length ? await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      educationCenterId: { in: [...new Set(sessions.map((session) => session.educationCenter.id))] },
    },
    select: { id: true, name: true, educationCenterId: true },
  }) : []
  const studentNames = new Map(students.map((student) => [`${student.educationCenterId}:${student.id}`, student.name]))
  const items = sessions.map((session, index) => ({
    ...session,
    records: entries[index].map(([studentId, status]) => ({
      studentId,
      studentName: studentNames.get(`${session.educationCenter.id}:${studentId}`) ?? null,
      status: typeof status === 'string' ? status : 'unknown',
    })),
  }))
  res.json({ items, total, page, pageSize })
}))

router.get('/teachers', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  const search = { contains: q, mode: 'insensitive' as const }
  const where = { educationCenterId, ...(q ? { OR: [{ name: search }, { phone: search }] } : {}) }
  const [items, total] = await prisma.$transaction([
    prisma.teacher.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true, name: true, phone: true, isActive: true,
        educationCenter: { select: centerSelect },
        _count: { select: { groups: true } },
      },
    }),
    prisma.teacher.count({ where }),
  ])
  res.json({ items, total, page, pageSize })
}))

router.get('/groups', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  const search = { contains: q, mode: 'insensitive' as const }
  const where = {
    educationCenterId,
    ...(q ? { OR: [{ name: search }, { course: { name: search } }, { teacher: { name: search } }] } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.group.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true, name: true, isActive: true, scheduleDays: true, scheduleTime: true,
        room: true, maxStudents: true,
        educationCenter: { select: centerSelect },
        course: { select: identitySelect },
        teacher: { select: identitySelect },
        _count: { select: { students: true } },
      },
    }),
    prisma.group.count({ where }),
  ])
  res.json({ items, total, page, pageSize })
}))

router.get('/courses', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  const where = { educationCenterId, ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}) }
  const [items, total] = await prisma.$transaction([
    prisma.course.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true, name: true, level: true, price: true, courseStatus: true, isActive: true,
        educationCenter: { select: centerSelect },
        _count: { select: { groups: true } },
      },
    }),
    prisma.course.count({ where }),
  ])
  res.json({ items, total, page, pageSize })
}))

router.get('/contracts', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  const search = { contains: q, mode: 'insensitive' as const }
  const where = {
    educationCenterId,
    ...(q ? { OR: [{ contractNumber: search }, { studentName: search }, { courseName: search }, { groupName: search }] } : {}),
  }
  const [items, total] = await prisma.$transaction([
    prisma.contract.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true, contractNumber: true, studentName: true, courseName: true, groupName: true,
        price: true, startDate: true, signDate: true, createdAt: true,
        educationCenter: { select: centerSelect },
        student: { select: identitySelect },
      },
    }),
    prisma.contract.count({ where }),
  ])
  res.json({ items, total, page, pageSize })
}))

router.get('/cash-expenses', asyncHandler(async (req, res) => {
  const { page, pageSize, educationCenterId, q } = querySchema.parse(req.query)
  // `category` is an enum, so only the free-text note is searchable.
  const where = { educationCenterId, ...(q ? { note: { contains: q, mode: 'insensitive' as const } } : {}) }
  const [items, total] = await prisma.$transaction([
    prisma.cashExpense.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      select: {
        id: true, category: true, amount: true, date: true, note: true, deleted: true,
        educationCenter: { select: centerSelect },
      },
    }),
    prisma.cashExpense.count({ where }),
  ])
  res.json({ items, total, page, pageSize })
}))

export default router
