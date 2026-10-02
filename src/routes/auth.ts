import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import * as authController from '../controllers/authController.js'

const router = Router()

router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.get('/me', authenticate, authController.me)

export default router
