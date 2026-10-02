import { prisma } from '../prisma.js'
import { HttpError } from '../utils/httpError.js'
import { signToken } from '../utils/jwt.js'
import type { LoginInput } from '../validation/schemas.js'

interface TenantContext {
  tenantCenterId?: string
  masterAccess?: boolean
}

/** The exported desktop app carries its own center's tenant token (the master token is for tooling). */
export const isDesktopClient = (tenant: TenantContext) => Boolean(tenant.tenantCenterId) && !tenant.masterAccess

// NOTE: passwords are stored and compared as plain text, per the engineer's explicit,
// accepted-risk decision in docs/specs/backend/0001-backend-service-architecture/index.md.
export async function login({ centerSlug, email, password }: LoginInput, tenant: TenantContext) {
  if (tenant.masterAccess && !tenant.tenantCenterId) {
    throw new HttpError(400, 'X-Education-Center-Id header required when using the master tenant token')
  }
  const center = tenant.tenantCenterId
    ? await prisma.educationCenter.findUnique({ where: { id: tenant.tenantCenterId } })
    : centerSlug
      ? await prisma.educationCenter.findUnique({ where: { slug: centerSlug } })
      : null
  console.log(center)
  if (!center || !center.isActive) {
    throw new HttpError(401, 'Invalid credentials from 1st')
  }
  console.log("1")
  const user = await prisma.user.findUnique({
    where: { educationCenterId_email: { educationCenterId: center.id, email } },
  })
  console.log("3", user)
  if (!user || user.password !== password) {
    throw new HttpError(401, 'Invalid credentials from 2nd')
  }
  console.log("2")
  const token = signToken(
    {
      userId: user.id,
      educationCenterId: center.id,
      role: user.role,
      teacherId: user.teacherId,
    },
    { longLived: isDesktopClient(tenant) },
  )
  return {
    token,
    role: user.role,
    teacherId: user.teacherId,
    educationCenter: { id: center.id, name: center.name, logoUrl: center.logoUrl },
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  return { id: user.id, email: user.email, role: user.role, teacherId: user.teacherId }
}
