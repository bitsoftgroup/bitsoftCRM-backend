import { asyncHandler } from '../utils/asyncHandler.js'
import { teacherCreateSchema, teacherUpdateSchema } from '../validation/schemas.js'
import * as teachersService from '../services/teachersService.js'

export const list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeDeleted === 'true' || req.query.deleted === 'true'
  res.json(await teachersService.listTeachers(req.user!.educationCenterId, includeInactive))
})

export const getOne = asyncHandler(async (req, res) => {
  res.json(await teachersService.getTeacher(req.user!.educationCenterId, req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  const data = teacherCreateSchema.parse(req.body)
  res.status(201).json(await teachersService.createTeacher(req.user!.educationCenterId, data))
})

export const update = asyncHandler(async (req, res) => {
  const data = teacherUpdateSchema.parse(req.body)
  res.json(await teachersService.updateTeacher(req.user!.educationCenterId, req.params.id, data))
})

export const remove = asyncHandler(async (req, res) => {
  res.json(await teachersService.deactivateTeacher(req.user!.educationCenterId, req.params.id))
})
