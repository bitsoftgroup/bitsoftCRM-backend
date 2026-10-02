import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { attendanceQuerySchema, attendanceUpsertSchema } from '../validation/schemas.js'
import * as attendanceService from '../services/attendanceService.js'

export const list = asyncHandler(async (req, res) => {
  const parsed = attendanceQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    const missingGroup = parsed.error.flatten().fieldErrors.groupId
    if (missingGroup) throw new HttpError(400, 'groupId is required')
    throw new HttpError(400, 'date, from and to must be YYYY-MM-DD')
  }
  res.json(await attendanceService.listAttendance(req.user!, parsed.data))
})

export const upsert = asyncHandler(async (req, res) => {
  const input = attendanceUpsertSchema.parse(req.body)
  res.json(await attendanceService.upsertAttendance(req.user!, input))
})
