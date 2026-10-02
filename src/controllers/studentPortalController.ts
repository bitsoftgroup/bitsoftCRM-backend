import { asyncHandler } from '../utils/asyncHandler.js'
import * as studentPortalService from '../services/studentPortalService.js'

export const payments = asyncHandler(async (req, res) => {
  const { phone, parentPhone } = req.query
  res.json(await studentPortalService.findPaymentsByPhone({ phone, parentPhone }, req.tenantCenterId))
})
