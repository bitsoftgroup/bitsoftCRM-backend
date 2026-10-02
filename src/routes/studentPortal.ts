import { Router } from 'express'
import * as studentPortalController from '../controllers/studentPortalController.js'

const router = Router()

// Unauthenticated by design: see studentPortalService.
router.get('/payments', studentPortalController.payments)

export default router
