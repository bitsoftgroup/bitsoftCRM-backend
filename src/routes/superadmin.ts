import { randomUUID } from 'crypto'
import path from 'path'
import { rmSync } from 'fs'
import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../prisma.js'
import { env } from '../env.js'
import { authenticateSuperAdmin, signSuperAdminToken } from '../middleware/auth.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { generateTenantToken } from '../lib/tenantToken.js'
import { enqueueExportJob, EXPORTS_DIR } from '../lib/desktopExport.js'
import {
  superAdminLoginSchema,
  educationCenterCreateSchema,
  educationCenterUpdateSchema,
} from '../validation/schemas.js'

const router = Router()

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

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/logos',
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads are allowed'))
    cb(null, true)
  },
})

// NOTE: passwords are stored and compared as plain text, matching the same accepted-risk
// decision as tenant User logins (see docs/specs/backend/0001-backend-service-architecture/index.md).
router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = superAdminLoginSchema.parse(req.body)
    const superAdmin = await prisma.superAdmin.findUnique({ where: { email } })
    if (!superAdmin || superAdmin.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    const token = signSuperAdminToken({ superAdminId: superAdmin.id })
    res.json({ token })
  }),
)

router.use(authenticateSuperAdmin)

router.get(
  '/education-centers',
  asyncHandler(async (_req, res) => {
    const centers = await prisma.educationCenter.findMany({ orderBy: { createdAt: 'desc' }, select: centerSelect })
    res.json(centers)
  }),
)

router.get(
  '/education-centers/:id',
  asyncHandler(async (req, res) => {
    const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id: req.params.id }, select: centerSelect })
    res.json(center)
  }),
)

router.post(
  '/education-centers',
  asyncHandler(async (req, res) => {
    const { adminEmail, adminPassword, ...data } = educationCenterCreateSchema.parse(req.body)
    // No tenant token is minted here: the first /export call mints one (see
    // desktopExport.ts), so a center never has a token sitting unused before its
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
    res.status(201).json(center)
  }),
)

router.patch(
  '/education-centers/:id',
  asyncHandler(async (req, res) => {
    const data = educationCenterUpdateSchema.parse(req.body)
    const center = await prisma.educationCenter.update({ where: { id: req.params.id }, data, select: centerSelect })
    res.json(center)
  }),
)

router.delete(
  '/education-centers/:id',
  asyncHandler(async (req, res) => {
    // Soft delete: deactivate instead of hard-deleting, so a tenant's historical data
    // (payments, contracts) is never destroyed by a superadmin click.
    const center = await prisma.educationCenter.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: centerSelect,
    })
    res.json(center)
  }),
)

router.delete(
  '/education-centers/:id/permanent',
  asyncHandler(async (req, res) => {
    const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id: req.params.id } })
    // Server-side confirmation, independent of the UI: the caller must echo the
    // center's exact slug back, so this can't fire from a stray/duplicate click.
    if (req.body?.confirmSlug !== center.slug) {
      return res.status(400).json({ error: 'confirmSlug must match this center\'s slug exactly' })
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
    res.status(204).end()
  }),
)

router.post(
  '/education-centers/:id/regenerate-token',
  asyncHandler(async (req, res) => {
    // Invalidates the center's previous tenant token (its exported .exe stops working
    // until re-exported) and returns the new plaintext token exactly once.
    const { token, hash } = generateTenantToken()
    const center = await prisma.educationCenter.update({
      where: { id: req.params.id },
      data: { tenantTokenHash: hash },
      select: centerSelect,
    })
    res.json({ ...center, tenantToken: token })
  }),
)

router.post(
  '/uploads/logo',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.status(201).json({ url: `${env.PUBLIC_BASE_URL}/uploads/logos/${req.file.filename}` })
  }),
)

router.post(
  '/education-centers/:id/export',
  asyncHandler(async (req, res) => {
    const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id: req.params.id } })
    const job = await prisma.exportJob.create({ data: { educationCenterId: center.id, status: 'pending' } })
    enqueueExportJob(job.id, center.id)
    res.status(202).json({ id: job.id, status: job.status })
  }),
)

router.get(
  '/education-centers/:id/export',
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findFirst({
      where: { educationCenterId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })
    if (!job) return res.status(404).json({ error: 'No export job yet' })
    res.json({ id: job.id, status: job.status, error: job.error, createdAt: job.createdAt })
  }),
)

router.get(
  '/exports/:jobId/download',
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findUniqueOrThrow({ where: { id: req.params.jobId } })
    if (job.status !== 'done' || !job.filePath) {
      return res.status(409).json({ error: 'Export is not ready, or was already downloaded — rebuild the app to download it again' })
    }
    const filePath = job.filePath
    res.download(filePath, async (err) => {
      // The .exe (~100MB+) is only kept on disk until it's actually been handed off —
      // rebuilding is cheap and this is what keeps repeated exports from filling the disk.
      if (!err) {
        rmSync(filePath, { force: true })
        await prisma.exportJob.update({ where: { id: job.id }, data: { filePath: null } })
      }
    })
  }),
)

export default router
