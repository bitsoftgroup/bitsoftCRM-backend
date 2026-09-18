import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { ZodError } from 'zod'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() })
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Conflict: duplicate value', meta: err.meta })
  }
  req.log?.error({ err }, 'Unhandled error')
  return res.status(500).json({ error: 'Internal server error' })
}
