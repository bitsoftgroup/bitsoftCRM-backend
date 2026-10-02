import { prisma } from '../prisma.js'
import type { PaymentCreateInput, PaymentUpdateInput } from '../validation/schemas.js'

export function listPayments(educationCenterId: string, deleted: boolean) {
  return prisma.payment.findMany({ where: { educationCenterId, deleted }, orderBy: { paidAt: 'desc' } })
}

export function getPayment(educationCenterId: string, id: string) {
  return prisma.payment.findFirstOrThrow({ where: { id, educationCenterId } })
}

export function createPayment(educationCenterId: string, data: PaymentCreateInput) {
  return prisma.payment.create({ data: { ...data, educationCenterId, paidAt: new Date() } })
}

export function updatePayment(educationCenterId: string, id: string, data: PaymentUpdateInput) {
  return prisma.payment.update({ where: { id, educationCenterId }, data })
}

export function softDeletePayment(educationCenterId: string, id: string) {
  return prisma.payment.update({ where: { id, educationCenterId }, data: { deleted: true } })
}
