import { asyncHandler } from '../utils/asyncHandler.js'
import * as tenantService from '../services/tenantService.js'

export const getBranding = asyncHandler(async (req, res) => {
  res.json(await tenantService.getBranding(req.tenantCenterId))
})
