import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../prisma.js'
import type { ContractCreateInput, ContractUpdateInput } from '../validation/schemas.js'

/**
 * Atomic per-year contract numbering (AC-4): uses a serializable transaction with an
 * upsert against a per-year counter row, so two concurrent requests never collide.
 */
export async function nextContractNumber(educationCenterId: string): Promise<string> {
  const year = new Date().getFullYear()
  const maxAttempts = 15
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const row = await tx.contractYearCounter.upsert({
            where: { educationCenterId_year: { educationCenterId, year } },
            create: { educationCenterId, year, counter: 1 },
            update: { counter: { increment: 1 } },
          })
          return row.counter
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      return `${result}/${year}`
    } catch (err) {
      // P2034: transaction failed due to a write conflict under Serializable isolation.
      // Concurrent contract creations are expected to race here; retry with jitter instead
      // of failing the request, since the whole point is that none of them may be rejected.
      const isSerializationConflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034'
      if (!isSerializationConflict || attempt === maxAttempts) throw err
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 * attempt))
    }
  }
  throw new Error('unreachable')
}

export function listContracts(educationCenterId: string) {
  return prisma.contract.findMany({ where: { educationCenterId }, orderBy: { createdAt: 'desc' } })
}

/** Peeks the next number without consuming it: current year counter + 1. */
export async function peekNextContractNumber(educationCenterId: string) {
  const year = new Date().getFullYear()
  const row = await prisma.contractYearCounter.findUnique({
    where: { educationCenterId_year: { educationCenterId, year } },
  })
  return { contractNumber: `${(row?.counter ?? 0) + 1}/${year}` }
}

export function getContract(educationCenterId: string, id: string) {
  return prisma.contract.findFirstOrThrow({ where: { id, educationCenterId } })
}

export async function createContract(educationCenterId: string, data: ContractCreateInput) {
  const contractNumber = await nextContractNumber(educationCenterId)

  // Branding fields (name, logo, director, address, phone) are always the tenant's
  // current customization, not whatever the client happens to send (AC-4's "server
  // computes trustworthy values" principle extended to the education center's own
  // identity, per the "everything customizable per center" requirement).
  const [center, settings] = await Promise.all([
    prisma.educationCenter.findUniqueOrThrow({ where: { id: educationCenterId } }),
    prisma.settings.findUnique({ where: { educationCenterId } }),
  ])
  const contractInfo = (settings?.contractInfo as {
    centerName?: string
    directorName?: string
    address?: string
    phone?: string
    graceDays?: number
  }) ?? {}

  return prisma.contract.create({
    data: {
      ...data,
      educationCenterId,
      contractNumber,
      centerName: contractInfo.centerName ?? center.name,
      centerLogoUrl: center.logoUrl ?? null,
      directorName: contractInfo.directorName || center.ownerName || null,
      address: contractInfo.address ?? null,
      centerPhone: contractInfo.phone ?? center.contactPhone ?? null,
      graceDays: data.graceDays ?? contractInfo.graceDays ?? null,
    },
  })
}

export function updateContract(educationCenterId: string, id: string, data: ContractUpdateInput) {
  return prisma.contract.update({ where: { id, educationCenterId }, data })
}

export async function deleteContract(educationCenterId: string, id: string) {
  await prisma.contract.delete({ where: { id, educationCenterId } })
}
