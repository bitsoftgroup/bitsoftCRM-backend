import type { CookieOptions, Request, Response } from 'express'
import { env } from '../env.js'
import { tokenExpiresAt } from './jwt.js'

export const SESSION_COOKIE = 'bitsoftCRM_session'

// httpOnly keeps the token out of reach of page scripts (XSS can no longer read it).
// SameSite=Lax stops the browser attaching it to cross-site POST/fetch requests.
const baseOptions: CookieOptions = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/api/v1' }

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(eq + 1).trim())
    } catch {
      return undefined
    }
  }
  return undefined
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions, expires: tokenExpiresAt(token) })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, baseOptions)
}
