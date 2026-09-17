import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'

/** Mirrors frontend/src/services/discountService.js: percent keyed by active-group count. */
export function getDiscountPercent(discounts: Record<string, number>, courseCount: number): number {
  if (courseCount <= 1) return 0
  if (discounts[String(courseCount)] !== undefined) return Number(discounts[String(courseCount)])
  const keys = Object.keys(discounts)
    .map(Number)
    .filter((k) => k <= courseCount)
    .sort((a, b) => b - a)
  return keys.length ? Number(discounts[String(keys[0])]) : 0
}

export function calcDiscountedPrice(price: number, discountPercent: number): number {
  return Math.round(price * (1 - discountPercent / 100))
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

interface HolidayRange {
  from: string
  to: string
}

/** Mirrors frontend/src/services/holidayService.js: calendar days of holiday overlapping monthStr. */
export function countHolidayDays(holidays: HolidayRange[], monthStr: string): number {
  if (!holidays.length || !monthStr) return 0
  const [y, m] = monthStr.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  let count = 0
  for (const h of holidays) {
    const from = new Date(h.from)
    const to = new Date(h.to)
    const overlapStart = from < start ? start : from
    const overlapEnd = to > end ? end : to
    if (overlapStart <= overlapEnd) {
      count += Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
    }
  }
  return count
}

/** Mirrors frontend/src/services/holidayService.js: scheduled lesson days lost to holidays in monthStr. */
export function countMissedLessons(holidays: HolidayRange[], monthStr: string, scheduleDays: string[]): number {
  if (!holidays.length || !monthStr || !scheduleDays?.length) return 0
  const dayNumbers = scheduleDays.map((d) => DAY_INDEX[d]).filter((n) => n !== undefined)
  const [y, m] = monthStr.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m, 0)
  let count = 0
  for (const h of holidays) {
    const from = new Date(h.from)
    const to = new Date(h.to)
    const overlapStart = from < monthStart ? monthStart : from
    const overlapEnd = to > monthEnd ? monthEnd : to
    const d = new Date(overlapStart)
    while (d <= overlapEnd) {
      if (dayNumbers.includes(d.getDay())) count++
      d.setDate(d.getDate() + 1)
    }
  }
  return count
}

export function todayLocalMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Mirrors the "roster" debt calculation in frontend/src/pages/admin/Payments.jsx:
 * for each active group the student belongs to, price = course price discounted by
 * the student's active-group count; a missing payment record for the current month
 * counts as full debt, 'partial' counts the remainder, 'paid' counts nothing.
 */
export async function computeStudentDebtStatus(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: { groups: { include: { group: { include: { course: true } } } } },
  })
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })
  const discounts = (settings?.discounts as Record<string, number>) ?? {}
  const month = todayLocalMonth()

  const activeMemberships = student.groups.filter((sg) => sg.group.isActive)
  const activeGroupCount = activeMemberships.length
  const discountPercent = getDiscountPercent(discounts, activeGroupCount)

  let totalPrice = 0
  let totalPaid = 0
  for (const membership of activeMemberships) {
    const course = membership.group.course
    const price = calcDiscountedPrice(Number(course.price), discountPercent)
    totalPrice += price
    const payment = await prisma.payment.findFirst({
      where: { studentId, groupId: membership.groupId, month, deleted: false },
    })
    if (!payment) continue
    if (payment.status === 'paid') totalPaid += Number(payment.originalPrice ?? price)
    else if (payment.status === 'partial') totalPaid += Number(payment.amount)
  }

  const balance = totalPaid - totalPrice
  const status: 'paid' | 'partial' | 'debt' | 'credit' =
    balance > 0 ? 'credit' : balance === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'debt'

  return { status, balance }
}

/**
 * Atomic per-year contract numbering (AC-4): uses a serializable transaction with an
 * upsert against a per-year counter row, so two concurrent requests never collide.
 */
export async function nextContractNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const maxAttempts = 15
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const row = await tx.contractYearCounter.upsert({
            where: { year },
            create: { year, counter: 1 },
            update: { counter: { increment: 1 } },
          })
          return row.counter
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      return `${result}/${year}`
    } catch (err) {
      // P2034: transaction failed due to a write conflict under Serializable isolation.
      // Concurrent contract creations are expected to race here; retry with jitter instead
      // of failing the request, since the whole point is that none of them may be rejected.
      const isSerializationConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
      if (!isSerializationConflict || attempt === maxAttempts) throw err
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 * attempt))
    }
  }
  throw new Error('unreachable')
}
