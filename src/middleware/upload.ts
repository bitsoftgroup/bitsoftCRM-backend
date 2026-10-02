import { randomUUID } from 'crypto'
import path from 'path'
import multer from 'multer'
import { HttpError } from '../utils/httpError.js'

export const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/logos',
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new HttpError(400, 'Only image uploads are allowed'))
    cb(null, true)
  },
})

// Desktop UI releases: a zipped frontend build, held in memory while it is validated.
export const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
})
