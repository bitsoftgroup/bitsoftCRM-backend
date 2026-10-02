import { asyncHandler } from '../utils/asyncHandler.js'
import { analyticsQuerySchema } from '../validation/schemas.js'
import * as analyticsService from '../services/superadminAnalyticsService.js'

export const getAnalytics = asyncHandler(async (req, res) => {
  const { period } = analyticsQuerySchema.parse(req.query)
  res.json(await analyticsService.getAnalytics(period))
})
