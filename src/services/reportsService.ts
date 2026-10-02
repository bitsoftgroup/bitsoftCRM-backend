import { prisma } from '../prisma.js'
import { HttpError } from '../utils/httpError.js'
import type { AuthTokenPayload } from '../utils/jwt.js'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export async function countTodaysClasses(user: AuthTokenPayload) {
  const today = DAY_NAMES[new Date().getDay()]
  const { educationCenterId } = user
  if (user.role === 'teacher' && !user.teacherId) {
    throw new HttpError(403, 'No teacher record linked to this account')
  }
  const where =
    user.role === 'teacher'
      ? { educationCenterId, teacherId: user.teacherId!, isActive: true, scheduleDays: { has: today } }
      : { educationCenterId, isActive: true, scheduleDays: { has: today } }
  const count = await prisma.group.count({ where })
  return { count }
}
