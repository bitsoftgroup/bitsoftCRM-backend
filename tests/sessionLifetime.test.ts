import assert from 'node:assert/strict'
import test from 'node:test'

// env.ts refuses to load without these; the values are irrelevant to signing here.
process.env.DATABASE_URL ??= 'postgresql://test'
process.env.JWT_SECRET ??= 'test-secret'
process.env.JWT_EXPIRES_IN = '7d'
const { signToken, tokenExpiresAt } = await import('../src/utils/jwt.js')
const { isDesktopClient } = await import('../src/services/authService.js')

const payload = { userId: 'u', educationCenterId: 'c', role: 'admin' as const, teacherId: null }
const hoursFromNow = (token: string) => (tokenExpiresAt(token)!.getTime() - Date.now()) / 3_600_000

test('browser logins expire after the configured lifetime (one week)', () => {
  const hours = hoursFromNow(signToken(payload))
  assert.ok(hours > 167.9 && hours <= 168.01, `expected ~168h, got ${hours}h`)
})

test('desktop logins stay valid for years, until the user logs out', () => {
  assert.ok(hoursFromNow(signToken(payload, { longLived: true })) > 24 * 365 * 5)
})

test('only apps carrying their own center tenant token count as desktop clients', () => {
  assert.equal(isDesktopClient({}), false)
  assert.equal(isDesktopClient({ tenantCenterId: 'c' }), true)
  assert.equal(isDesktopClient({ tenantCenterId: 'c', masterAccess: true }), false)
  assert.equal(isDesktopClient({ masterAccess: true }), false)
})
