import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { ANALYTICS_TIME_ZONE, analyticsRange, summarizeAnalytics, type AnalyticsDailyRow } from '../lib/superadminAnalytics.js'

// Mounted behind the parent router's superadmin authentication.
const router = Router()
const querySchema = z.object({ period: z.enum(['week', 'month', 'year']).default('month') })

router.get('/analytics', asyncHandler(async (req, res) => {
  const { period } = querySchema.parse(req.query)
  const range = analyticsRange(period)
  // Aggregate in PostgreSQL rather than loading every student/payment/attendance
  // into memory. Date-only payment and lesson dates keep their saved calendar day;
  // enrollment/payment timestamps are converted from UTC to the reporting zone.
  const [centers, rows] = await prisma.$transaction([
    prisma.educationCenter.findMany({
      select: { id: true, name: true, slug: true, isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    }),
    prisma.$queryRaw<AnalyticsDailyRow[]>`
      WITH events AS (
        SELECT "educationCenterId", day, 1 AS students, 0 AS payments, 0::numeric AS amount,
          0 AS sessions, 0 AS present, 0 AS absent, 0 AS late, 0 AS excused
        FROM (
          SELECT "educationCenterId",
            ("enrolledAt" AT TIME ZONE 'UTC' AT TIME ZONE ${ANALYTICS_TIME_ZONE})::date AS day
          FROM "Student"
        ) s WHERE day >= ${range.from}::date AND day < ${range.endExclusive}::date
        UNION ALL
        SELECT "educationCenterId", day, 0, 1, amount, 0, 0, 0, 0, 0
        FROM (
          SELECT "educationCenterId", amount,
            COALESCE("paidDate"::date, ("paidAt" AT TIME ZONE 'UTC' AT TIME ZONE ${ANALYTICS_TIME_ZONE})::date) AS day
          FROM "Payment" WHERE NOT deleted AND status IN ('paid', 'partial')
        ) p WHERE day >= ${range.from}::date AND day < ${range.endExclusive}::date
        UNION ALL
        SELECT a."educationCenterId", a.date::date, 0, 0, 0::numeric, 1,
          marks.present, marks.absent, marks.late, marks.excused
        FROM "Attendance" a
        CROSS JOIN LATERAL (
          SELECT COUNT(*) FILTER (WHERE value = 'present')::integer AS present,
            COUNT(*) FILTER (WHERE value = 'absent')::integer AS absent,
            COUNT(*) FILTER (WHERE value = 'late')::integer AS late,
            COUNT(*) FILTER (WHERE value = 'excused')::integer AS excused
          FROM jsonb_each_text(CASE WHEN jsonb_typeof(a.records) = 'object' THEN a.records ELSE '{}'::jsonb END)
        ) marks
        WHERE a.date >= ${range.from}::date AND a.date < ${range.endExclusive}::date
      )
      SELECT "educationCenterId", to_char(day, 'YYYY-MM-DD') AS date,
        SUM(students)::integer AS "newStudents", SUM(payments)::integer AS "paymentCount",
        SUM(amount) AS "paymentAmount", SUM(sessions)::integer AS "attendanceSessions",
        SUM(present)::integer AS present, SUM(absent)::integer AS absent,
        SUM(late)::integer AS late, SUM(excused)::integer AS excused
      FROM events GROUP BY "educationCenterId", day ORDER BY day, "educationCenterId"
    `,
  ], { isolationLevel: 'RepeatableRead' })
  res.json(summarizeAnalytics(centers, rows, range))
}))

export default router
