import { asyncHandler } from '../utils/asyncHandler.js'
import { clearSessionCookie, setSessionCookie } from '../utils/cookies.js'
import { loginSchema } from '../validation/schemas.js'
import * as authService from '../services/authService.js'

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body)
  const { token, ...session } = await authService.login(input, {
    tenantCenterId: req.tenantCenterId,
    masterAccess: req.masterAccess,
  })
  // Tenant-token clients (the exported desktop app) are not a browser session: they get the
  // token in the body and send it as a Bearer header. Plain browsers get it only as an
  // httpOnly cookie, so page scripts never see it.
  if (req.tenantCenterId || req.masterAccess) return res.json({ token, ...session })
  setSessionCookie(res, token)
  res.json(session)
})

export const logout = asyncHandler(async (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})

export const me = asyncHandler(async (req, res) => {
  res.json(await authService.getCurrentUser(req.user!.userId))
})
