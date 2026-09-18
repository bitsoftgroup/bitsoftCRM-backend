import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../prisma.js'
import { env } from '../env.js'
import { hashTenantToken } from '../lib/tenantToken.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantCenterId?: string
      masterAccess?: boolean
    }
  }
}

/** Identifies which education center a request belongs to from the
 * X-Tenant-Token header, before any per-user JWT is checked. This is the
 * credential the exported desktop app carries; a normal user login still
 * happens on top of it (see `authenticate`'s cross-check).
 *
 * The header is optional: the browser-based frontend predates tenant tokens
 * and still identifies its center via `centerSlug` in the login body, then
 * relies solely on its JWT afterwards. When the header is absent, tenant
 * resolution is simply skipped here (req.tenantCenterId stays unset) and
 * `authenticate`'s cross-check no-ops, so that legacy path keeps working. */
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-tenant-token']
  if (typeof token !== 'string' || !token) {
    return next()
  }
  const hash = hashTenantToken(token)

  if (env.MASTER_TOKEN_HASH && hash === env.MASTER_TOKEN_HASH) {
    req.masterAccess = true
    const centerId = req.headers['x-education-center-id']
    if (typeof centerId === 'string' && centerId) {
      const center = await prisma.educationCenter.findUnique({ where: { id: centerId } })
      if (!center || !center.isActive) {
        return res.status(401).json({ error: 'Unknown or inactive X-Education-Center-Id' })
      }
      req.tenantCenterId = center.id
    }
    return next()
  }

  const center = await prisma.educationCenter.findUnique({ where: { tenantTokenHash: hash } })
  if (!center || !center.isActive) {
    return res.status(401).json({ error: 'Invalid tenant token' })
  }
  req.tenantCenterId = center.id
  next()
}
