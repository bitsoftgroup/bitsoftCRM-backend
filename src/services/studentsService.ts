import { prisma } from '../prisma.js'
import { calcDiscountedPrice, getDiscountPercent, todayLocalMonth } from '../utils/business.js'
import type { StudentCreateInput, StudentDeleteInput, StudentUpdateInput } from '../validation/schemas.js'

function serialize(student: { groups: { groupId: string }[] } & Record<string, unknown>) {
  return { ...student, groupIds: student.groups.map((g) => g.groupId) }
}

export async function listStudents(educationCenterId: string, opts: { deleted: boolean; includeDeleted: boolean }) {
  const students = await prisma.student.findMany({
    where: {
      educationCenterId,
      ...(opts.deleted ? { deleted: true } : opts.includeDeleted ? {} : { deleted: false }),
    },
    include: { groups: true },
    orderBy: opts.deleted ? { deletedAt: 'desc' } : { name: 'asc' },
  })
  return students.map(serialize)
}

export async function getStudent(educationCenterId: string, id: string) {
  const student = await prisma.student.findFirstOrThrow({
    where: { id, educationCenterId },
    include: { groups: true },
  })
  return serialize(student)
}

export async function createStudent(educationCenterId: string, data: StudentCreateInput) {
  const student = await prisma.student.create({
    data: { ...data, educationCenterId },
    include: { groups: true },
  })
  return serialize(student)
}

export async function updateStudent(educationCenterId: string, id: string, data: StudentUpdateInput) {
  const student = await prisma.student.update({
    where: { id, educationCenterId },
    data,
    include: { groups: true },
  })
  return serialize(student)
}

export function softDeleteStudent(educationCenterId: string, id: string, extra: StudentDeleteInput) {
  return prisma.student.update({
    where: { id, educationCenterId },
    data: { deleted: true, deletedAt: new Date(), ...extra },
  })
}

export function restoreStudent(educationCenterId: string, id: string) {
  return prisma.student.update({
    where: { id, educationCenterId },
    data: { deleted: false, deletedAt: null, deleteNote: null, deleteBalanceType: null, deleteBalanceAmount: null },
  })
}

export async function permanentlyDeleteStudent(educationCenterId: string, id: string) {
  await prisma.student.delete({ where: { id, educationCenterId } })
}

export async function addStudentToGroup(educationCenterId: string, studentId: string, groupId: string) {
  await prisma.student.findFirstOrThrow({ where: { id: studentId, educationCenterId } })
  await prisma.group.findFirstOrThrow({ where: { id: groupId, educationCenterId } })
  await prisma.studentGroup.upsert({
    where: { studentId_groupId: { studentId, groupId } },
    create: { studentId, groupId },
    update: {},
  })
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, include: { groups: true } })
  return serialize(student)
}

export async function removeStudentFromGroup(educationCenterId: string, studentId: string, groupId: string) {
  await prisma.student.findFirstOrThrow({ where: { id: studentId, educationCenterId } })
  await prisma.studentGroup.delete({ where: { studentId_groupId: { studentId, groupId } } })
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, include: { groups: true } })
  return serialize(student)
}

/**
 * Mirrors the "roster" debt calculation in frontend/src/pages/admin/Payments.jsx:
 * for each active group the student belongs to, price = course price discounted by
 * the student's active-group count; a missing payment record for the current month
 * counts as full debt, 'partial' counts the remainder, 'paid' counts nothing.
 */
export async function computeStudentDebtStatus(studentId: string, educationCenterId: string) {
  const student = await prisma.student.findFirstOrThrow({
    where: { id: studentId, educationCenterId },
    include: { groups: { include: { group: { include: { course: true } } } } },
  })
  const settings = await prisma.settings.findUnique({ where: { educationCenterId } })
  const discounts = (settings?.discounts as Record<string, number>) ?? {}
  const month = todayLocalMonth()

  const activeMemberships = student.groups.filter((sg) => sg.group.isActive)
  const activeGroupCount = activeMemberships.length
  const discountPercent = getDiscountPercent(discounts, activeGroupCount)

  let totalPrice = 0
  let totalPaid = 0
  for (const membership of activeMemberships) {
    const course = membership.group.course
    const price = calcDiscountedPrice(Number(course.price), discountPercent)
    totalPrice += price
    const payment = await prisma.payment.findFirst({
      where: { studentId, groupId: membership.groupId, month, deleted: false, educationCenterId },
    })
    if (!payment) continue
    if (payment.status === 'paid') totalPaid += Number(payment.originalPrice ?? price)
    else if (payment.status === 'partial') totalPaid += Number(payment.amount)
  }

  const balance = totalPaid - totalPrice
  const status: 'paid' | 'partial' | 'debt' | 'credit' =
    balance > 0 ? 'credit' : balance === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'debt'

  return { status, balance }
}
