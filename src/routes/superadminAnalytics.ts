import { Router } from 'express'
import * as analyticsController from '../controllers/superadminAnalyticsController.js'

// Mounted behind the parent router's superadmin authentication.
const router = Router()

router.get('/analytics', analyticsController.getAnalytics)

export default router
