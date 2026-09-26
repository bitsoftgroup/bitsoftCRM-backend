import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { Prisma } from '../../generated/prisma/client.js'
import { ZodError } from 'zod'
import { HttpError } from '../lib/httpError.js'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() })
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message })
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return res.status(status).json({ error: err.message })
  }
  // body-parser (express.json) errors carry a `type`; without this a malformed body is a 500.
  const bodyParserType = (err as { type?: unknown } | null)?.type
  if (bodyParserType === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' })
  if (bodyParserType === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' })
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Conflict: duplicate value', meta: err.meta })
    // Foreign key violation: deleting a row other data still points at, or pointing at a row that doesn't exist.
    if (err.code === 'P2003') return res.status(409).json({ error: 'Conflict: record is referenced by other data or references a missing record' })
  }
  req.log?.error({ err }, 'Unhandled error')
  return res.status(500).json({ error: 'Internal server error' })
}
