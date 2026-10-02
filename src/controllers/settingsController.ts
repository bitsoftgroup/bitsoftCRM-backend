import { asyncHandler } from '../utils/asyncHandler.js'
import {
  cashOpeningBalanceSchema,
  contractInfoSchema,
  discountsSchema,
  holidaysSchema,
  roomsSchema,
} from '../validation/schemas.js'
import * as settingsService from '../services/settingsService.js'

export const getDiscounts = asyncHandler(async (req, res) => {
  res.json(await settingsService.getDiscounts(req.user!.educationCenterId))
})

export const updateDiscounts = asyncHandler(async (req, res) => {
  const discounts = discountsSchema.parse(req.body)
  res.json(await settingsService.updateDiscounts(req.user!.educationCenterId, discounts))
})

export const getHolidays = asyncHandler(async (req, res) => {
  res.json(await settingsService.getHolidays(req.user!.educationCenterId))
})

export const updateHolidays = asyncHandler(async (req, res) => {
  const holidays = holidaysSchema.parse(req.body)
  res.json(await settingsService.updateHolidays(req.user!.educationCenterId, holidays))
})

export const getRooms = asyncHandler(async (req, res) => {
  res.json(await settingsService.getRooms(req.user!.educationCenterId))
})

export const updateRooms = asyncHandler(async (req, res) => {
  const rooms = roomsSchema.parse(req.body)
  res.json(await settingsService.updateRooms(req.user!.educationCenterId, rooms))
})

export const getContractInfo = asyncHandler(async (req, res) => {
  res.json(await settingsService.getContractInfo(req.user!.educationCenterId))
})

export const updateContractInfo = asyncHandler(async (req, res) => {
  const contractInfo = contractInfoSchema.parse(req.body)
  res.json(await settingsService.updateContractInfo(req.user!.educationCenterId, contractInfo))
})

export const getCashOpeningBalance = asyncHandler(async (req, res) => {
  res.json(await settingsService.getCashOpeningBalance(req.user!.educationCenterId))
})

export const updateCashOpeningBalance = asyncHandler(async (req, res) => {
  const { amount } = cashOpeningBalanceSchema.parse(req.body)
  res.json(await settingsService.updateCashOpeningBalance(req.user!.educationCenterId, amount))
})
