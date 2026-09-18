import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'

const router = Router()

// Public within the tenant-token scope (no user login yet): the exported desktop
// app calls this before and after login to render the right name/logo/owner.
router.get(
  '/branding',
  asyncHandler(async (req, res) => {
    if (!req.tenantCenterId) {
      return res.status(400).json({ error: 'X-Education-Center-Id header required when using the master tenant token' })
    }
    const center = await prisma.educationCenter.findUniqueOrThrow({
      where: { id: req.tenantCenterId },
      select: { id: true, name: true, logoUrl: true, ownerName: true, isActive: true },
    })
    res.json(center)
  }),
)

export default router
