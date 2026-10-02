import { prisma } from '../prisma.js'
import type { TeacherCreateInput, TeacherUpdateInput } from '../validation/schemas.js'

export function listTeachers(educationCenterId: string, includeInactive: boolean) {
  return prisma.teacher.findMany({
    where: { educationCenterId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { name: 'asc' },
  })
}

export function getTeacher(educationCenterId: string, id: string) {
  return prisma.teacher.findFirstOrThrow({ where: { id, educationCenterId } })
}

export function createTeacher(educationCenterId: string, data: TeacherCreateInput) {
  return prisma.teacher.create({ data: { ...data, educationCenterId, isActive: true } })
}

export function updateTeacher(educationCenterId: string, id: string, data: TeacherUpdateInput) {
  return prisma.teacher.update({ where: { id, educationCenterId }, data })
}

export function deactivateTeacher(educationCenterId: string, id: string) {
  return prisma.teacher.update({ where: { id, educationCenterId }, data: { isActive: false } })
}
