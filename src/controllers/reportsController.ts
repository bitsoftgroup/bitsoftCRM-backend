import { asyncHandler } from '../utils/asyncHandler.js'
import * as reportsService from '../services/reportsService.js'

export const todaysClasses = asyncHandler(async (req, res) => {
  res.json(await reportsService.countTodaysClasses(req.user!))
})
