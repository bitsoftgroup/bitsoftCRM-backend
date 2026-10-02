import { prisma } from '../prisma.js'
import type { RecordsQuery } from '../validation/schemas.js'

// Deliberately global, read only lists, including archived data and inactive centers.
const centerSelect = { id: true, name: true, slug: true, isActive: true } as const
const identitySelect = { id: true, name: true } as const
const search = (q: string) => ({ contains: q, mode: 'insensitive' as const })

export async function listStudents({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  const where = {
    educationCenterId,
    ...(q ? { OR: [{ name: search(q) }, { phone: search(q) }, { parentPhone: search(q) }] } : {}),
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
  return { items, total, page, pageSize }
}

export async function listPayments({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  const where = {
    educationCenterId,
    ...(q ? { OR: [{ student: { name: search(q) } }, { group: { name: search(q) } }, { month: search(q) }] } : {}),
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
  return { items, total, page, pageSize }
}

export async function listAttendance({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  const where = {
    educationCenterId,
    ...(q ? { group: { OR: [{ name: search(q) }, { course: { name: search(q) } }, { teacher: { name: search(q) } }] } } : {}),
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
  return { items, total, page, pageSize }
}

export async function listTeachers({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  const where = { educationCenterId, ...(q ? { OR: [{ name: search(q) }, { phone: search(q) }] } : {}) }
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
  return { items, total, page, pageSize }
}

export async function listGroups({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  const where = {
    educationCenterId,
    ...(q ? { OR: [{ name: search(q) }, { course: { name: search(q) } }, { teacher: { name: search(q) } }] } : {}),
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
  return { items, total, page, pageSize }
}

export async function listCourses({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  const where = { educationCenterId, ...(q ? { name: search(q) } : {}) }
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
  return { items, total, page, pageSize }
}

export async function listContracts({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  const where = {
    educationCenterId,
    ...(q
      ? { OR: [{ contractNumber: search(q) }, { studentName: search(q) }, { courseName: search(q) }, { groupName: search(q) }] }
      : {}),
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
  return { items, total, page, pageSize }
}

export async function listCashExpenses({ page, pageSize, educationCenterId, q }: RecordsQuery) {
  // `category` is an enum, so only the free-text note is searchable.
  const where = { educationCenterId, ...(q ? { note: search(q) } : {}) }
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
  return { items, total, page, pageSize }
}
