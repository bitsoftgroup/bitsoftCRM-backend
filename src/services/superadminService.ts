import path from 'path'
import { rmSync } from 'fs'
import { prisma } from '../prisma.js'
import { env } from '../env.js'
import { HttpError } from '../utils/httpError.js'
import { signSuperAdminToken } from '../utils/jwt.js'
import { generateTenantToken } from '../utils/tenantToken.js'
import { enqueueExportJob, EXPORTS_DIR } from './desktopExportService.js'
import type {
  EducationCenterCreateInput,
  EducationCenterUpdateInput,
  SuperAdminLoginInput,
} from '../validation/schemas.js'

// EducationCenter rows are never sent to the client with their tenantTokenHash.
const centerSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  contactEmail: true,
  contactPhone: true,
  ownerName: true,
  ownerPhone: true,
  ownerEmail: true,
  isActive: true,
  createdAt: true,
} as const

// NOTE: passwords are stored and compared as plain text, matching the same accepted-risk
// decision as tenant User logins (see docs/specs/backend/0001-backend-service-architecture/index.md).
export async function login({ email, password }: SuperAdminLoginInput) {
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email } })
  if (!superAdmin || superAdmin.password !== password) {
    throw new HttpError(401, 'Invalid credentials')
  }
  return { token: signSuperAdminToken({ superAdminId: superAdmin.id }) }
}

export function listCenters() {
  return prisma.educationCenter.findMany({ orderBy: { createdAt: 'desc' }, select: centerSelect })
}

export function getCenter(id: string) {
  return prisma.educationCenter.findUniqueOrThrow({ where: { id }, select: centerSelect })
}

export async function createCenter(input: EducationCenterCreateInput) {
  const { adminEmail, adminPassword, ...data } = input
  // No tenant token is minted here: the first /export call mints one (see
  // desktopExportService.ts), so a center never has a token sitting unused before its
  // desktop app is actually built.
  const center = await prisma.educationCenter.create({ data, select: centerSelect })
  // Every education center starts with its own settings row (discount table, holidays,
  // contract branding defaults) so the tenant's admin can edit it immediately.
  await prisma.settings.create({
    data: {
      educationCenterId: center.id,
      discounts: { '2': 10, '3': 15, '4': 20 },
      holidays: [],
      rooms: [],
      contractInfo: {
        centerName: center.name,
        directorName: data.ownerName,
        address: '',
        phone: center.contactPhone ?? '',
        graceDays: 5,
      },
      cashOpeningBalance: 0,
    },
  })
  // Without this, a freshly created center has no login at all (EducationCenter
  // itself never stores a password — that lives on User, per-staff-member).
  await prisma.user.create({
    data: { educationCenterId: center.id, email: adminEmail, password: adminPassword, role: 'admin' },
  })
  return center
}

export function updateCenter(id: string, data: EducationCenterUpdateInput) {
  return prisma.educationCenter.update({ where: { id }, data, select: centerSelect })
}

/** Soft delete: deactivate instead of hard-deleting, so a tenant's historical data
 * (payments, contracts) is never destroyed by a superadmin click. */
export function deactivateCenter(id: string) {
  return prisma.educationCenter.update({ where: { id }, data: { isActive: false }, select: centerSelect })
}

export async function deleteCenterPermanently(id: string, confirmSlug: unknown) {
  const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id } })
  // Server-side confirmation, independent of the UI: the caller must echo the
  // center's exact slug back, so this can't fire from a stray/duplicate click.
  if (confirmSlug !== center.slug) {
    throw new HttpError(400, 'confirmSlug must match this center\'s slug exactly')
  }
  const educationCenterId = center.id
  // Deleted in dependency order (leaves first) since every FK to EducationCenter
  // is ON DELETE RESTRICT by design — this is the one place that's meant to be
  // able to override that, not an accident of a missing cascade elsewhere.
  await prisma.$transaction([
    prisma.studentGroup.deleteMany({ where: { student: { educationCenterId } } }),
    prisma.attendance.deleteMany({ where: { educationCenterId } }),
    prisma.payment.deleteMany({ where: { educationCenterId } }),
    prisma.contract.deleteMany({ where: { educationCenterId } }),
    prisma.user.deleteMany({ where: { educationCenterId } }),
    prisma.group.deleteMany({ where: { educationCenterId } }),
    prisma.student.deleteMany({ where: { educationCenterId } }),
    prisma.teacher.deleteMany({ where: { educationCenterId } }),
    prisma.course.deleteMany({ where: { educationCenterId } }),
    prisma.cashExpense.deleteMany({ where: { educationCenterId } }),
    prisma.settings.deleteMany({ where: { educationCenterId } }),
    prisma.contractYearCounter.deleteMany({ where: { educationCenterId } }),
    prisma.exportJob.deleteMany({ where: { educationCenterId } }),
    prisma.educationCenter.delete({ where: { id: educationCenterId } }),
  ])
  rmSync(path.join(EXPORTS_DIR, educationCenterId), { recursive: true, force: true })
}

/** Invalidates the center's previous tenant token (its exported .exe stops working
 * until re-exported) and returns the new plaintext token exactly once. */
export async function regenerateTenantToken(id: string) {
  const { token, hash } = generateTenantToken()
  const center = await prisma.educationCenter.update({
    where: { id },
    data: { tenantTokenHash: hash },
    select: centerSelect,
  })
  return { ...center, tenantToken: token }
}

export function logoUrlFor(filename: string) {
  return `${env.PUBLIC_BASE_URL}/uploads/logos/${filename}`
}

export async function startExport(centerId: string) {
  const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id: centerId } })
  const job = await prisma.exportJob.create({ data: { educationCenterId: center.id, status: 'pending' } })
  enqueueExportJob(job.id, center.id)
  return { id: job.id, status: job.status }
}

export async function getLatestExport(centerId: string) {
  const job = await prisma.exportJob.findFirst({
    where: { educationCenterId: centerId },
    orderBy: { createdAt: 'desc' },
  })
  if (!job) throw new HttpError(404, 'No export job yet')
  return { id: job.id, status: job.status, error: job.error, createdAt: job.createdAt }
}

/** Resolves the finished export a download request may serve. */
export async function getDownloadableExport(jobId: string) {
  const job = await prisma.exportJob.findUniqueOrThrow({ where: { id: jobId } })
  if (job.status !== 'done' || !job.filePath) {
    throw new HttpError(409, 'Export is not ready, or was already downloaded — rebuild the app to download it again')
  }
  return { id: job.id, filePath: job.filePath }
}

/** The .exe (~100MB+) is only kept on disk until it's actually been handed off —
 * rebuilding is cheap and this is what keeps repeated exports from filling the disk. */
export async function releaseDownloadedExport(job: { id: string; filePath: string }) {
  rmSync(job.filePath, { force: true })
  await prisma.exportJob.update({ where: { id: job.id }, data: { filePath: null } })
}
