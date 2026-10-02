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
