import { asyncHandler } from '../utils/asyncHandler.js'
import { cashExpenseCreateSchema, cashExpenseUpdateSchema } from '../validation/schemas.js'
import * as cashExpensesService from '../services/cashExpensesService.js'

export const list = asyncHandler(async (req, res) => {
  res.json(await cashExpensesService.listCashExpenses(req.user!.educationCenterId, req.query.deleted === 'true'))
})

export const getOne = asyncHandler(async (req, res) => {
  res.json(await cashExpensesService.getCashExpense(req.user!.educationCenterId, req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  const data = cashExpenseCreateSchema.parse(req.body)
  res.status(201).json(await cashExpensesService.createCashExpense(req.user!.educationCenterId, data))
})

export const update = asyncHandler(async (req, res) => {
  const data = cashExpenseUpdateSchema.parse(req.body)
  res.json(await cashExpensesService.updateCashExpense(req.user!.educationCenterId, req.params.id, data))
})

export const remove = asyncHandler(async (req, res) => {
  res.json(await cashExpensesService.softDeleteCashExpense(req.user!.educationCenterId, req.params.id))
})

export const restore = asyncHandler(async (req, res) => {
  res.json(await cashExpensesService.restoreCashExpense(req.user!.educationCenterId, req.params.id))
})

export const removePermanently = asyncHandler(async (req, res) => {
  await cashExpensesService.permanentlyDeleteCashExpense(req.user!.educationCenterId, req.params.id)
  res.status(204).end()
})
