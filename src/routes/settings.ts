import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import * as settingsController from '../controllers/settingsController.js'

const router = Router()
router.use(authenticate, requireRole('admin'))

router.get('/discounts', settingsController.getDiscounts)
router.put('/discounts', settingsController.updateDiscounts)
router.get('/holidays', settingsController.getHolidays)
router.put('/holidays', settingsController.updateHolidays)
router.get('/rooms', settingsController.getRooms)
router.put('/rooms', settingsController.updateRooms)
router.get('/contract-info', settingsController.getContractInfo)
router.put('/contract-info', settingsController.updateContractInfo)
router.get('/cash-opening-balance', settingsController.getCashOpeningBalance)
router.put('/cash-opening-balance', settingsController.updateCashOpeningBalance)

export default router
