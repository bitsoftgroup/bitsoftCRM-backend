import type { NextFunction, Request, Response } from 'express'
import { readCookie, SESSION_COOKIE } from '../utils/cookies.js'
import { verifyToken, type AuthTokenPayload, type Role, type SuperAdminTokenPayload } from '../utils/jwt.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload
      superAdmin?: SuperAdminTokenPayload
    }
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Bearer header first (desktop app, API clients), then the httpOnly session cookie (browser). */
function extractCredential(req: Request): { token: string; fromCookie: boolean } | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return { token: header.slice('Bearer '.length), fromCookie: false }
  const cookie = readCookie(req, SESSION_COOKIE)
  return cookie ? { token: cookie, fromCookie: true } : null
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const credential = extractCredential(req)
  if (!credential) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }
  // Cookies are sent by the browser on its own, so a state-changing request authenticated
  // by one must prove it came from our frontend: a custom header forces a CORS preflight
  // that other origins cannot pass with credentials.
  if (credential.fromCookie && !SAFE_METHODS.has(req.method) && req.headers['x-requested-with'] !== 'bitsoftCRM') {
    return res.status(403).json({ error: 'Missing X-Requested-With header' })
  }
  try {
    const payload = verifyToken(credential.token)
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
    const payload = verifyToken(token)
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
