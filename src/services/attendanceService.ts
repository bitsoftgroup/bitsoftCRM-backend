import { prisma } from '../prisma.js'
import { HttpError } from '../utils/httpError.js'
import type { AuthTokenPayload } from '../utils/jwt.js'
import type { AttendanceQueryInput, AttendanceUpsertInput } from '../validation/schemas.js'

/** Verifies the group belongs to the caller's tenant, and (for teachers) to them specifically. */
async function assertOwnsGroup(user: AuthTokenPayload, groupId: string) {
  const group = await prisma.group.findFirst({
    where: { id: groupId, educationCenterId: user.educationCenterId },
  })
  const owns = !!group && (user.role !== 'teacher' || group.teacherId === user.teacherId)
  if (!owns) throw new HttpError(403, 'Not your group')
}

export async function listAttendance(user: AuthTokenPayload, { groupId, date, from, to }: AttendanceQueryInput) {
  await assertOwnsGroup(user, groupId)

  const where: Record<string, unknown> = { groupId, educationCenterId: user.educationCenterId }
  if (date) where.date = new Date(date)
  else if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  return prisma.attendance.findMany({ where, orderBy: { date: 'asc' } })
}

export async function upsertAttendance(user: AuthTokenPayload, { groupId, date, records }: AttendanceUpsertInput) {
  await assertOwnsGroup(user, groupId)

  return prisma.attendance.upsert({
    where: { groupId_date: { groupId, date: new Date(date) } },
    create: { groupId, date: new Date(date), records, educationCenterId: user.educationCenterId },
    update: { records },
  })
}
