import { Router } from 'express'
import * as tenantController from '../controllers/tenantController.js'

const router = Router()

// Public within the tenant-token scope (no user login yet): the exported desktop
// app calls this before and after login to render the right name/logo/owner.
router.get('/branding', tenantController.getBranding)

export default router
