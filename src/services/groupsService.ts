import { prisma } from '../prisma.js'
import { HttpError } from '../utils/httpError.js'
import type { AuthTokenPayload } from '../utils/jwt.js'
import type { GroupCreateInput, GroupUpdateInput } from '../validation/schemas.js'

export async function listGroups(user: AuthTokenPayload, includeInactive: boolean) {
  const { educationCenterId } = user
  if (user.role === 'teacher' && !user.teacherId) {
    throw new HttpError(403, 'No teacher record linked to this account')
  }
  const where =
    user.role === 'teacher'
      ? { educationCenterId, teacherId: user.teacherId! }
      : { educationCenterId, ...(includeInactive ? {} : { isActive: true }) }
  return prisma.group.findMany({ where, orderBy: { name: 'asc' } })
}

export async function getGroup(user: AuthTokenPayload, id: string) {
  const group = await prisma.group.findFirstOrThrow({
    where: { id, educationCenterId: user.educationCenterId },
  })
  if (user.role === 'teacher' && group.teacherId !== user.teacherId) {
    throw new HttpError(403, 'Not your group')
  }
  return group
}

export function createGroup(educationCenterId: string, data: GroupCreateInput) {
  return prisma.group.create({ data: { ...data, educationCenterId, isActive: true } })
}

export function updateGroup(educationCenterId: string, id: string, data: GroupUpdateInput) {
  return prisma.group.update({ where: { id, educationCenterId }, data })
}

export function deactivateGroup(educationCenterId: string, id: string) {
  return prisma.group.update({ where: { id, educationCenterId }, data: { isActive: false } })
}
