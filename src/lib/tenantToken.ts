import { randomBytes, createHash } from 'crypto'

/** Generates a new plaintext tenant token and its sha256 hash. The plaintext
 * is shown to the superadmin exactly once and never persisted. */
export function generateTenantToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url')
  return { token, hash: hashTenantToken(token) }
}

export function hashTenantToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
