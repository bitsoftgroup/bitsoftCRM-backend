import { prisma } from '../prisma.js'
import type { CourseCreateInput, CourseUpdateInput } from '../validation/schemas.js'

export function listCourses(educationCenterId: string, includeInactive: boolean) {
  return prisma.course.findMany({
    where: { educationCenterId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { name: 'asc' },
  })
}

export function getCourse(educationCenterId: string, id: string) {
  return prisma.course.findFirstOrThrow({ where: { id, educationCenterId } })
}

export function createCourse(educationCenterId: string, data: CourseCreateInput) {
  return prisma.course.create({ data: { ...data, educationCenterId, isActive: true } })
}

export function updateCourse(educationCenterId: string, id: string, data: CourseUpdateInput) {
  return prisma.course.update({ where: { id, educationCenterId }, data })
}

export function deactivateCourse(educationCenterId: string, id: string) {
  return prisma.course.update({ where: { id, educationCenterId }, data: { isActive: false } })
}
