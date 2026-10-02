import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import {
  educationCenterCreateSchema,
  educationCenterUpdateSchema,
  superAdminLoginSchema,
} from '../validation/schemas.js'
import * as superadminService from '../services/superadminService.js'

export const login = asyncHandler(async (req, res) => {
  const input = superAdminLoginSchema.parse(req.body)
  res.json(await superadminService.login(input))
})

export const listCenters = asyncHandler(async (_req, res) => {
  res.json(await superadminService.listCenters())
})

export const getCenter = asyncHandler(async (req, res) => {
  res.json(await superadminService.getCenter(req.params.id))
})

export const createCenter = asyncHandler(async (req, res) => {
  const input = educationCenterCreateSchema.parse(req.body)
  res.status(201).json(await superadminService.createCenter(input))
})

export const updateCenter = asyncHandler(async (req, res) => {
  const data = educationCenterUpdateSchema.parse(req.body)
  res.json(await superadminService.updateCenter(req.params.id, data))
})

export const deactivateCenter = asyncHandler(async (req, res) => {
  res.json(await superadminService.deactivateCenter(req.params.id))
})

export const deleteCenterPermanently = asyncHandler(async (req, res) => {
  await superadminService.deleteCenterPermanently(req.params.id, req.body?.confirmSlug)
  res.status(204).end()
})

export const regenerateTenantToken = asyncHandler(async (req, res) => {
  res.json(await superadminService.regenerateTenantToken(req.params.id))
})

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded')
  res.status(201).json({ url: superadminService.logoUrlFor(req.file.filename) })
})

export const startExport = asyncHandler(async (req, res) => {
  res.status(202).json(await superadminService.startExport(req.params.id))
})

export const getExportStatus = asyncHandler(async (req, res) => {
  res.json(await superadminService.getLatestExport(req.params.id))
})

export const downloadExport = asyncHandler(async (req, res) => {
  const job = await superadminService.getDownloadableExport(req.params.jobId)
  res.download(job.filePath, async (err) => {
    if (!err) await superadminService.releaseDownloadedExport(job)
  })
})
