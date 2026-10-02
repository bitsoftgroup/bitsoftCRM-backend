import { asyncHandler } from '../utils/asyncHandler.js'
import { contractCreateSchema, contractUpdateSchema } from '../validation/schemas.js'
import * as contractsService from '../services/contractsService.js'

export const list = asyncHandler(async (req, res) => {
  res.json(await contractsService.listContracts(req.user!.educationCenterId))
})

export const nextNumber = asyncHandler(async (req, res) => {
  res.json(await contractsService.peekNextContractNumber(req.user!.educationCenterId))
})

export const getOne = asyncHandler(async (req, res) => {
  res.json(await contractsService.getContract(req.user!.educationCenterId, req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  const data = contractCreateSchema.parse(req.body)
  res.status(201).json(await contractsService.createContract(req.user!.educationCenterId, data))
})

export const update = asyncHandler(async (req, res) => {
  const data = contractUpdateSchema.parse(req.body)
  res.json(await contractsService.updateContract(req.user!.educationCenterId, req.params.id, data))
})

export const remove = asyncHandler(async (req, res) => {
  await contractsService.deleteContract(req.user!.educationCenterId, req.params.id)
  res.status(204).end()
})
