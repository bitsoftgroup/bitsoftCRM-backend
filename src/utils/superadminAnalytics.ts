import { Prisma } from '../../generated/prisma/client.js'

export const ANALYTICS_TIME_ZONE = 'Asia/Dushanbe'
export type AnalyticsPeriod = 'week' | 'month' | 'year'
export interface AnalyticsMetrics {
  newStudents: number
  paymentCount: number
  paymentAmount: string
  attendanceSessions: number
  present: number
  absent: number
  late: number
  excused: number
}
export interface AnalyticsDailyRow extends Omit<AnalyticsMetrics, 'paymentAmount'> {
  educationCenterId: string
  date: string
  paymentAmount: Prisma.Decimal | string
}

export function analyticsRange(period: AnalyticsPeriod, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: ANALYTICS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const start = new Date(`${today}T00:00:00.000Z`)
  if (period === 'year') {
    start.setUTCDate(1)
    start.setUTCMonth(start.getUTCMonth() - 11)
  } else start.setUTCDate(start.getUTCDate() - (period === 'week' ? 6 : 29))
  const end = new Date(`${today}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() + 1)
  const buckets: string[] = []
  for (const cursor = new Date(start); cursor < end;) {
    buckets.push(cursor.toISOString().slice(0, 10))
    if (period === 'year') cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    else cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return {
    period, from: start.toISOString().slice(0, 10), to: today,
    endExclusive: end.toISOString().slice(0, 10),
    interval: period === 'year' ? 'month' as const : 'day' as const,
    timeZone: ANALYTICS_TIME_ZONE, buckets,
  }
}

function emptyMetrics(): AnalyticsMetrics {
  return { newStudents: 0, paymentCount: 0, paymentAmount: '0.00', attendanceSessions: 0, present: 0, absent: 0, late: 0, excused: 0 }
}

function addMetrics(target: AnalyticsMetrics, source: AnalyticsMetrics | AnalyticsDailyRow) {
  for (const key of ['newStudents', 'paymentCount', 'attendanceSessions', 'present', 'absent', 'late', 'excused'] as const) {
    target[key] += source[key]
  }
  target.paymentAmount = new Prisma.Decimal(target.paymentAmount).plus(source.paymentAmount).toFixed(2)
}

export function summarizeAnalytics(
  centers: { id: string; name: string; slug: string; isActive: boolean }[],
  rows: AnalyticsDailyRow[],
  range: ReturnType<typeof analyticsRange>,
) {
  const makeSeries = () => range.buckets.map((date) => ({ date, ...emptyMetrics() }))
  const result = centers.map((center) => ({ ...center, totals: emptyMetrics(), series: makeSeries() }))
  const byCenter = new Map(result.map((center) => [center.id, center]))
  const bucketIndexes = new Map(range.buckets.map((date, index) => [date, index]))
  const totals = emptyMetrics()
  const series = makeSeries()
  for (const row of rows) {
    if (row.date < range.from || row.date > range.to) continue
    const center = byCenter.get(row.educationCenterId)
    const bucket = range.interval === 'month' ? `${row.date.slice(0, 7)}-01` : row.date
    const index = bucketIndexes.get(bucket)
    if (!center || index === undefined) continue
    addMetrics(center.totals, row)
    addMetrics(center.series[index], row)
    addMetrics(totals, row)
    addMetrics(series[index], row)
  }
  return { period: range.period, from: range.from, to: range.to, interval: range.interval, timeZone: range.timeZone, totals, series, centers: result }
}
