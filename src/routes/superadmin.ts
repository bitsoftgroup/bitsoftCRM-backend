import { Router } from 'express'
import { authenticateSuperAdmin } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import * as superadminController from '../controllers/superadminController.js'
import recordsRoutes from './superadminRecords.js'
import analyticsRoutes from './superadminAnalytics.js'

const router = Router()

router.post('/auth/login', superadminController.login)

router.use(authenticateSuperAdmin)
router.use(recordsRoutes)
router.use(analyticsRoutes)

router.get('/education-centers', superadminController.listCenters)
router.get('/education-centers/:id', superadminController.getCenter)
router.post('/education-centers', superadminController.createCenter)
router.patch('/education-centers/:id', superadminController.updateCenter)
router.delete('/education-centers/:id', superadminController.deactivateCenter)
router.delete('/education-centers/:id/permanent', superadminController.deleteCenterPermanently)
router.post('/education-centers/:id/regenerate-token', superadminController.regenerateTenantToken)
router.post('/uploads/logo', upload.single('file'), superadminController.uploadLogo)
router.post('/education-centers/:id/export', superadminController.startExport)
router.get('/education-centers/:id/export', superadminController.getExportStatus)
router.get('/exports/:jobId/download', superadminController.downloadExport)

export default router
