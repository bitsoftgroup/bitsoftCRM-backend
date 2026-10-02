import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { releasePublishSchema } from '../validation/schemas.js'
import * as releaseService from '../services/desktopReleaseService.js'

// --- superadmin: publish and manage releases ---

export const publish = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded')
  const input = releasePublishSchema.parse(req.body)
  const { files, ...manifest } = await releaseService.publishRelease(req.file.buffer, input)
  res.status(201).json({ ...manifest, fileCount: files.length })
})

export const list = asyncHandler(async (_req, res) => {
  res.json(await releaseService.listReleases())
})

export const activate = asyncHandler(async (req, res) => {
  await releaseService.activateRelease(req.params.version)
  res.json(await releaseService.listReleases())
})

// --- desktop apps: what UI should I run, and the files for it ---

export const uiManifest = asyncHandler(async (_req, res) => {
  const manifest = await releaseService.getCurrentManifest()
  if (!manifest) throw new HttpError(404, 'No release published')
  res.set('Cache-Control', 'no-store').json(manifest)
})

export const uiBlob = asyncHandler(async (req, res) => {
  const file = await releaseService.findBlob(req.params.sha256)
  if (!file) throw new HttpError(404, 'Not found')
  // Content-addressed: the bytes behind a hash never change.
  res.set('Cache-Control', 'public, max-age=31536000, immutable').type('application/octet-stream').sendFile(file)
})
