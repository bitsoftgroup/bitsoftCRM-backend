// One-time import of the JSON snapshot produced by scripts/exportFirebase.ts into
// PostgreSQL via Prisma, preserving every relationship (AC-5). Firebase push IDs are
// remapped to new UUIDs; the id maps below keep every foreign key pointed at the right row.
// All imported rows belong to one EducationCenter (upserted by slug below), since this
// script only ever migrates one existing customer's Firebase data at a time.
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

type FirebaseMap = Record<string, Record<string, Record<string, unknown>>>

function loadSnapshot(): FirebaseMap {
  const file = path.resolve(import.meta.dirname, '../data/firebase-export.json')
  if (!fs.existsSync(file)) {
    throw new Error(`No snapshot found at ${file}. Run "npm run firebase:export" first.`)
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function getGroupIds(student: Record<string, unknown>): string[] {
  if (Array.isArray(student.groupIds) && student.groupIds.length) return student.groupIds as string[]
  if (student.groupId) return [student.groupId as string]
  return []
}

/** Firebase export data is inconsistent (numeric timestamps, ISO strings, empty strings, typos). */
function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? null : date
}

async function main() {
  const snapshot = loadSnapshot()

  const centerSlug = process.env.IMPORT_CENTER_SLUG || 'bitsoft'
  const centerName = process.env.IMPORT_CENTER_NAME || 'BitSoft'
  const center = await prisma.educationCenter.upsert({
    where: { slug: centerSlug },
    create: { slug: centerSlug, name: centerName },
    update: {},
  })
  const educationCenterId = center.id
  console.log(`Importing into education center "${center.name}" (slug: ${centerSlug})`)

  const teacherIdMap = new Map<string, string>()
  const courseIdMap = new Map<string, string>()
  const studentIdMap = new Map<string, string>()
  const groupIdMap = new Map<string, string>()

  for (const [fbId, val] of Object.entries(snapshot.teachers ?? {})) {
    const teacher = await prisma.teacher.create({
      data: {
        educationCenterId,
        name: String(val.name ?? ''),
        phone: (val.phone as string) ?? null,
        isActive: val.isActive !== false,
      },
    })
    teacherIdMap.set(fbId, teacher.id)
  }
  console.log(`Imported ${teacherIdMap.size} teachers`)

  for (const [fbId, val] of Object.entries(snapshot.courses ?? {})) {
    const course = await prisma.course.create({
      data: {
        educationCenterId,
        name: String(val.name ?? ''),
        level: (val.level as 'beginner' | 'intermediate' | 'pro') ?? 'beginner',
        price: Number(val.price ?? 0),
        courseStatus: (val.courseStatus as 'active' | 'planned') ?? 'active',
        isActive: val.isActive !== false,
      },
    })
    courseIdMap.set(fbId, course.id)
  }
  console.log(`Imported ${courseIdMap.size} courses`)

  for (const [fbId, val] of Object.entries(snapshot.groups ?? {})) {
    const courseId = courseIdMap.get(val.courseId as string)
    const teacherId = teacherIdMap.get(val.teacherId as string)
    if (!courseId || !teacherId) {
      console.warn(`Skipping group ${fbId}: missing course or teacher mapping`)
      continue
    }
    const schedule = (val.schedule as { days?: string[]; time?: string; durationMinutes?: number }) ?? {}
    const group = await prisma.group.create({
      data: {
        educationCenterId,
        name: String(val.name ?? ''),
        courseId,
        teacherId,
        maxStudents: (val.maxStudents as number) ?? null,
        scheduleDays: schedule.days ?? [],
        scheduleTime: schedule.time ?? null,
        scheduleDurationMinutes: schedule.durationMinutes ?? null,
        room: (val.room as string) ?? null,
        isActive: val.isActive !== false,
      },
    })
    groupIdMap.set(fbId, group.id)
  }
  console.log(`Imported ${groupIdMap.size} groups`)

  for (const [fbId, val] of Object.entries(snapshot.students ?? {})) {
    const interestCourseId = val.interestCourseId ? courseIdMap.get(val.interestCourseId as string) ?? null : null
    const student = await prisma.student.create({
      data: {
        educationCenterId,
        name: String(val.name ?? ''),
        phone: (val.phone as string) ?? null,
        parentPhone: (val.parentPhone as string) ?? null,
        birthDate: parseDate(val.birthDate),
        status: (val.status as 'active' | 'frozen' | 'graduated' | 'dropped' | 'pending') ?? 'active',
        dueDay: Number(val.dueDay ?? 1),
        interestCourseId,
        notes: (val.notes as string) ?? null,
        enrolledAt: parseDate(val.enrolledAt) ?? new Date(),
        deleted: Boolean(val.deleted),
        deletedAt: parseDate(val.deletedAt),
        deleteNote: (val.deleteNote as string) ?? null,
        deleteBalanceType: (val.deleteBalanceType as 'debt' | 'credit' | null) ?? null,
        deleteBalanceAmount: val.deleteBalanceAmount != null ? Number(val.deleteBalanceAmount) : null,
      },
    })
    studentIdMap.set(fbId, student.id)

    for (const fbGroupId of getGroupIds(val)) {
      const groupId = groupIdMap.get(fbGroupId)
      if (!groupId) continue
      await prisma.studentGroup.create({ data: { studentId: student.id, groupId } })
    }
  }
  console.log(`Imported ${studentIdMap.size} students`)

  let paymentCount = 0
  for (const [, val] of Object.entries(snapshot.payments ?? {})) {
    const studentId = studentIdMap.get(val.studentId as string)
    if (!studentId) continue
    const groupId = val.groupId ? groupIdMap.get(val.groupId as string) ?? null : null
    await prisma.payment.create({
      data: {
        educationCenterId,
        studentId,
        groupId,
        amount: Number(val.amount ?? 0),
        month: String(val.month ?? ''),
        dueDay: val.dueDay != null ? Number(val.dueDay) : null,
        paidAt: parseDate(val.paidAt) ?? new Date(),
        method: (val.method as 'cash' | 'card' | 'transfer') ?? 'cash',
        status: (val.status as 'paid' | 'partial' | 'debt') ?? 'debt',
        discount: val.discount != null ? Number(val.discount) : null,
        originalPrice: val.originalPrice != null ? Number(val.originalPrice) : null,
        notes: (val.notes as string) ?? null,
        deleted: Boolean(val.deleted),
      },
    })
    paymentCount++
  }
  console.log(`Imported ${paymentCount} payments`)

  let attendanceCount = 0
  let attendanceSkipped = 0
  for (const [key, val] of Object.entries(snapshot.attendance ?? {})) {
    const fbGroupId = (val.groupId as string) ?? key.split('_')[0]
    const groupId = groupIdMap.get(fbGroupId)
    const date = parseDate(val.date)
    if (!groupId || !date) {
      attendanceSkipped++
      continue
    }
    await prisma.attendance.create({
      data: {
        educationCenterId,
        groupId,
        date,
        records: (val.records as Record<string, string>) ?? {},
      },
    })
    attendanceCount++
  }
  console.log(`Imported ${attendanceCount} attendance records${attendanceSkipped ? ` (skipped ${attendanceSkipped}: missing group or unparseable date)` : ''}`)

  let contractCount = 0
  const maxContractByYear = new Map<number, number>()
  for (const [, val] of Object.entries(snapshot.contracts ?? {})) {
    const studentId = studentIdMap.get(val.studentId as string)
    const courseId = courseIdMap.get(val.courseId as string)
    if (!studentId || !courseId) continue
    const groupId = val.groupId ? groupIdMap.get(val.groupId as string) ?? null : null
    const contractNumber = String(val.contractNumber ?? '')
    await prisma.contract.create({
      data: {
        educationCenterId,
        studentId,
        groupId,
        courseId,
        contractNumber,
        address: (val.address as string) ?? null,
        centerPhone: (val.centerPhone as string) ?? null,
        centerName: (val.centerName as string) ?? null,
        centerLogoUrl: center.logoUrl ?? null,
        directorName: (val.directorName as string) ?? null,
        studentName: (val.studentName as string) ?? null,
        birthDate: parseDate(val.birthDate),
        phone: (val.phone as string) ?? null,
        parentPhone: (val.parentPhone as string) ?? null,
        courseName: (val.courseName as string) ?? null,
        groupName: (val.groupName as string) ?? null,
        price: val.price != null ? Number(val.price) : null,
        graceDays: val.graceDays != null ? Number(val.graceDays) : null,
        startDate: parseDate(val.startDate),
        signDate: parseDate(val.signDate),
        createdAt: parseDate(val.createdAt) ?? new Date(),
      },
    })
    contractCount++
    const match = /^(\d+)\/(\d+)$/.exec(contractNumber)
    if (match) {
      const [, num, year] = match
      maxContractByYear.set(Number(year), Math.max(maxContractByYear.get(Number(year)) ?? 0, Number(num)))
    }
  }
  for (const [year, counter] of maxContractByYear) {
    await prisma.contractYearCounter.upsert({
      where: { educationCenterId_year: { educationCenterId, year } },
      create: { educationCenterId, year, counter },
      update: { counter },
    })
  }
  console.log(`Imported ${contractCount} contracts`)

  let expenseCount = 0
  for (const [, val] of Object.entries(snapshot.cashExpenses ?? {})) {
    const createdAt = parseDate(val.createdAt) ?? new Date()
    await prisma.cashExpense.create({
      data: {
        educationCenterId,
        category: (val.category as 'rent' | 'utilities' | 'salary' | 'supplies' | 'other') ?? 'other',
        amount: Number(val.amount ?? 0),
        date: parseDate(val.date) ?? createdAt,
        note: (val.note as string) ?? null,
        createdAt,
        deleted: Boolean(val.deleted),
        deletedAt: parseDate(val.deletedAt),
      },
    })
    expenseCount++
  }
  console.log(`Imported ${expenseCount} cash expenses`)

  const settings = (snapshot.settings ?? {}) as Record<string, unknown>
  await prisma.settings.upsert({
    where: { educationCenterId },
    create: {
      educationCenterId,
      discounts: (settings.discounts as object) ?? { 2: 10, 3: 15, 4: 20 },
      holidays: (settings.holidays as object) ?? [],
      rooms: (settings.rooms as string[]) ?? [],
      contractInfo: (settings.contractInfo as object) ?? {},
      cashOpeningBalance: Number(settings.cashOpeningBalance ?? 0),
    },
    update: {
      discounts: (settings.discounts as object) ?? { 2: 10, 3: 15, 4: 20 },
      holidays: (settings.holidays as object) ?? [],
      rooms: (settings.rooms as string[]) ?? [],
      contractInfo: (settings.contractInfo as object) ?? {},
      cashOpeningBalance: Number(settings.cashOpeningBalance ?? 0),
    },
  })
  console.log('Imported settings')

  console.log('Migration complete.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
