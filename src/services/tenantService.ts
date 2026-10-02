import { prisma } from '../prisma.js'
import { HttpError } from '../utils/httpError.js'

export async function getBranding(tenantCenterId: string | undefined) {
  if (!tenantCenterId) {
    throw new HttpError(400, 'X-Education-Center-Id header required when using the master tenant token')
  }
  return prisma.educationCenter.findUniqueOrThrow({
    where: { id: tenantCenterId },
    select: { id: true, name: true, logoUrl: true, ownerName: true, isActive: true },
  })
}
