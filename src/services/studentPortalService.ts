import { prisma } from '../prisma.js'
import { HttpError } from '../utils/httpError.js'
import { normalizePhone } from '../utils/phone.js'

/**
 * Unauthenticated by design: the student mobile app has no CRM login, so a
 * student/parent is identified by phone number instead of a JWT, mirroring
 * the lookup the app previously did directly against Firebase.
 */
export async function findPaymentsByPhone(
  query: { phone: unknown; parentPhone: unknown },
  tenantCenterId: string | undefined,
) {
  const phone = normalizePhone(query.phone)
  const parentPhone = normalizePhone(query.parentPhone)
  const candidates = [phone, parentPhone].filter(Boolean)
  if (candidates.length === 0) {
    throw new HttpError(400, 'phone or parentPhone query param is required')
  }

  // With a tenant token the lookup stays inside that center: the same phone number
  // can exist in two centers, and must not turn into a cross-center "multiple matches".
  const students = await prisma.student.findMany({
    where: { deleted: false, ...(tenantCenterId ? { educationCenterId: tenantCenterId } : {}) },
    select: { id: true, phone: true, parentPhone: true },
  })
  const matches = students.filter((student) => {
    const studentPhone = normalizePhone(student.phone)
    const studentParentPhone = normalizePhone(student.parentPhone)
    return candidates.includes(studentPhone) || candidates.includes(studentParentPhone)
  })

  if (matches.length > 1) {
    throw new HttpError(409, 'Multiple students matched this phone number')
  }
  if (matches.length === 0) {
    return []
  }

  return prisma.payment.findMany({
    where: { studentId: matches[0].id, deleted: false },
    orderBy: { paidAt: 'desc' },
  })
}
