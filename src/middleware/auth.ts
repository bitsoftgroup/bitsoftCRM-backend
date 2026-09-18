import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../env.js'

export type Role = 'admin' | 'reception' | 'teacher'

export interface AuthTokenPayload {
  kind: 'user'
  userId: string
  educationCenterId: string
  role: Role
  teacherId: string | null
}

export interface SuperAdminTokenPayload {
  kind: 'superadmin'
  superAdminId: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
      superAdmin?: SuperAdminTokenPayload
    }
  }
}

function sign(payload: AuthTokenPayload | SuperAdminTokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

export function signToken(payload: Omit<AuthTokenPayload, 'kind'>): string {
  return sign({ kind: 'user', ...payload })
}

export function signSuperAdminToken(payload: Omit<SuperAdminTokenPayload, 'kind'>): string {
  return sign({ kind: 'superadmin', ...payload })
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = header.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload | SuperAdminTokenPayload
    if (payload.kind !== 'user') return res.status(401).json({ error: 'Invalid token for this endpoint' })
    // The X-Tenant-Token (resolved earlier by `resolveTenant`) and this user's JWT must
    // agree on the same center, unless the request carries the master tenant token.
    if (!req.masterAccess && req.tenantCenterId && payload.educationCenterId !== req.tenantCenterId) {
      return res.status(401).json({ error: 'Tenant token does not match this user' })
    }
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function authenticateSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  const token = header.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload | SuperAdminTokenPayload
    if (payload.kind !== 'superadmin') return res.status(401).json({ error: 'Invalid token for this endpoint' })
    req.superAdmin = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient role for this action' })
    }
    next()
  }
}

/** Teachers may only act on their own linked teacherId; admin/reception are unrestricted. */
export function requireOwnTeacher(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (req.user.role !== 'teacher') return next()
  if (!req.user.teacherId) return res.status(403).json({ error: 'No teacher record linked to this account' })
  next()
}
