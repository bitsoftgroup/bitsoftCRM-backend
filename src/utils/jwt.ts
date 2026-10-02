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

function sign(payload: AuthTokenPayload | SuperAdminTokenPayload, expiresIn: string = env.JWT_EXPIRES_IN): string {
  const options: jwt.SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  return jwt.sign(payload, env.JWT_SECRET, options)
}

/** `longLived` is for the desktop app, which stays signed in until the user logs out. */
export function signToken(payload: Omit<AuthTokenPayload, 'kind'>, { longLived = false } = {}): string {
  return sign({ kind: 'user', ...payload }, longLived ? env.DESKTOP_JWT_EXPIRES_IN : env.JWT_EXPIRES_IN)
}

export function signSuperAdminToken(payload: Omit<SuperAdminTokenPayload, 'kind'>): string {
  return sign({ kind: 'superadmin', ...payload })
}

export function verifyToken(token: string): AuthTokenPayload | SuperAdminTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload | SuperAdminTokenPayload
}

/** When a signed token stops being valid, so the session cookie can expire together with it. */
export function tokenExpiresAt(token: string): Date | undefined {
  const exp = (jwt.decode(token) as { exp?: number } | null)?.exp
  return exp ? new Date(exp * 1000) : undefined
}
