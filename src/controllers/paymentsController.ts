import { asyncHandler } from '../utils/asyncHandler.js'
import { paymentCreateSchema, paymentUpdateSchema } from '../validation/schemas.js'
import * as paymentsService from '../services/paymentsService.js'

export const list = asyncHandler(async (req, res) => {
  res.json(await paymentsService.listPayments(req.user!.educationCenterId, req.query.deleted === 'true'))
})

export const getOne = asyncHandler(async (req, res) => {
  res.json(await paymentsService.getPayment(req.user!.educationCenterId, req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  const data = paymentCreateSchema.parse(req.body)
  res.status(201).json(await paymentsService.createPayment(req.user!.educationCenterId, data))
})

export const update = asyncHandler(async (req, res) => {
  const data = paymentUpdateSchema.parse(req.body)
  res.json(await paymentsService.updatePayment(req.user!.educationCenterId, req.params.id, data))
})

export const remove = asyncHandler(async (req, res) => {
  res.json(await paymentsService.softDeletePayment(req.user!.educationCenterId, req.params.id))
})
