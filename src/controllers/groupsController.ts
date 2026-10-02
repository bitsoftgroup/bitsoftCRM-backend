import { asyncHandler } from '../utils/asyncHandler.js'
import { groupCreateSchema, groupUpdateSchema } from '../validation/schemas.js'
import * as groupsService from '../services/groupsService.js'

export const list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeDeleted === 'true' || req.query.deleted === 'true'
  res.json(await groupsService.listGroups(req.user!, includeInactive))
})

export const getOne = asyncHandler(async (req, res) => {
  res.json(await groupsService.getGroup(req.user!, req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  const data = groupCreateSchema.parse(req.body)
  res.status(201).json(await groupsService.createGroup(req.user!.educationCenterId, data))
})

export const update = asyncHandler(async (req, res) => {
  const data = groupUpdateSchema.parse(req.body)
  res.json(await groupsService.updateGroup(req.user!.educationCenterId, req.params.id, data))
})

export const remove = asyncHandler(async (req, res) => {
  res.json(await groupsService.deactivateGroup(req.user!.educationCenterId, req.params.id))
})
