import { prisma } from '../prisma.js'
import type { CashExpenseCreateInput, CashExpenseUpdateInput } from '../validation/schemas.js'

export function listCashExpenses(educationCenterId: string, isDeletedView: boolean) {
  return prisma.cashExpense.findMany({
    where: { educationCenterId, deleted: isDeletedView },
    orderBy: isDeletedView ? { deletedAt: 'desc' } : { date: 'desc' },
  })
}

export function getCashExpense(educationCenterId: string, id: string) {
  return prisma.cashExpense.findFirstOrThrow({ where: { id, educationCenterId } })
}

export function createCashExpense(educationCenterId: string, data: CashExpenseCreateInput) {
  return prisma.cashExpense.create({ data: { ...data, educationCenterId } })
}

export function updateCashExpense(educationCenterId: string, id: string, data: CashExpenseUpdateInput) {
  return prisma.cashExpense.update({ where: { id, educationCenterId }, data })
}

export function softDeleteCashExpense(educationCenterId: string, id: string) {
  return prisma.cashExpense.update({
    where: { id, educationCenterId },
    data: { deleted: true, deletedAt: new Date() },
  })
}

export function restoreCashExpense(educationCenterId: string, id: string) {
  return prisma.cashExpense.update({
    where: { id, educationCenterId },
    data: { deleted: false, deletedAt: null },
  })
}

export async function permanentlyDeleteCashExpense(educationCenterId: string, id: string) {
  await prisma.cashExpense.delete({ where: { id, educationCenterId } })
}
