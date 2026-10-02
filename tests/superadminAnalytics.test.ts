import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyticsRange, summarizeAnalytics, type AnalyticsDailyRow } from '../src/utils/superadminAnalytics.js'

test('week uses seven reporting dates across the local midnight boundary', () => {
  const before = analyticsRange('week', new Date('2026-09-18T18:59:59Z'))
  const after = analyticsRange('week', new Date('2026-09-18T19:00:00Z'))
  assert.equal(before.to, '2026-09-18')
  assert.equal(after.from, '2026-09-13')
  assert.equal(after.to, '2026-09-19')
  assert.equal(after.endExclusive, '2026-09-20')
  assert.equal(after.buckets.length, 7)
})

test('month includes exactly thirty dates across leap day and year boundaries', () => {
  const leap = analyticsRange('month', new Date('2024-03-01T12:00:00Z'))
  assert.equal(leap.from, '2024-02-01')
  assert.equal(leap.buckets.length, 30)
  assert.ok(leap.buckets.includes('2024-02-29'))
  const january = analyticsRange('month', new Date('2026-01-02T12:00:00Z'))
  assert.equal(january.from, '2025-12-04')
  assert.equal(january.buckets.length, 30)
})

test('year has twelve calendar months and ends today, not at the end of the month', () => {
  const range = analyticsRange('year', new Date('2026-01-31T12:00:00Z'))
  assert.equal(range.from, '2025-02-01')
  assert.equal(range.to, '2026-01-31')
  assert.equal(range.buckets.length, 12)
  assert.equal(range.buckets.at(-1), '2026-01-01')
  assert.equal(range.interval, 'month')
})

const centers = [
  { id: 'alpha', name: 'Alpha', slug: 'alpha', isActive: true },
  { id: 'beta', name: 'Beta', slug: 'beta', isActive: false },
  { id: 'empty', name: 'Empty', slug: 'empty', isActive: true },
]
const row = (overrides: Partial<AnalyticsDailyRow>): AnalyticsDailyRow => ({
  educationCenterId: 'alpha', date: '2026-09-18', newStudents: 0, paymentCount: 0,
  paymentAmount: '0.00', attendanceSessions: 0, present: 0, absent: 0, late: 0, excused: 0,
  ...overrides,
})

test('center totals stay separate, money is exact, and missing days/centers are zero filled', () => {
  const result = summarizeAnalytics(centers, [
    row({ newStudents: 2, paymentCount: 1, paymentAmount: '0.10', attendanceSessions: 1, present: 2, absent: 1, late: 1, excused: 1 }),
    row({ date: '2026-09-19', paymentCount: 1, paymentAmount: '0.20' }),
    row({ educationCenterId: 'beta', newStudents: 3, paymentCount: 1, paymentAmount: '100.99', attendanceSessions: 2 }),
  ], analyticsRange('week', new Date('2026-09-19T12:00:00Z')))
  assert.equal(result.totals.newStudents, 5)
  assert.equal(result.totals.paymentAmount, '101.29')
  assert.equal(result.totals.attendanceSessions, 3)
  assert.equal(result.centers[0].totals.paymentAmount, '0.30')
  assert.equal(result.centers[1].totals.newStudents, 3)
  assert.equal(result.centers[1].isActive, false)
  assert.equal(result.centers[2].totals.newStudents, 0)
  assert.equal(result.centers[2].series.length, 7)
  assert.ok(result.centers[2].series.every((point) => point.paymentAmount === '0.00'))
  assert.equal(result.series[0].newStudents, 0)
  assert.equal(result.series.at(-2)?.newStudents, 5)
  assert.equal(result.series.at(-2)?.present, 2)
})

test('yearly chart combines days in their month and excludes out of range rows', () => {
  const result = summarizeAnalytics(centers, [
    row({ date: '2026-01-01', newStudents: 2 }),
    row({ date: '2026-01-31', newStudents: 4 }),
    row({ date: '2025-01-31', newStudents: 100 }),
    row({ date: '2026-02-01', newStudents: 100 }),
    row({ educationCenterId: 'not-a-center', date: '2026-01-01', newStudents: 100 }),
  ], analyticsRange('year', new Date('2026-01-31T12:00:00Z')))
  assert.equal(result.totals.newStudents, 6)
  assert.equal(result.centers[0].series.at(-1)?.newStudents, 6)
  assert.equal(result.series.at(-1)?.newStudents, 6)
  assert.equal(result.centers[1].series.at(-1)?.newStudents, 0)
})
