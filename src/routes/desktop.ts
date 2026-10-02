import { Router } from 'express'
import { requireTenant } from '../middleware/tenant.js'
import * as releasesController from '../controllers/desktopReleasesController.js'

const router = Router()
router.use(requireTenant)

router.get('/ui/manifest', releasesController.uiManifest)
router.get('/ui/blobs/:sha256', releasesController.uiBlob)

export default router
