import { asyncHandler } from '../utils/asyncHandler.js'
import { courseCreateSchema, courseUpdateSchema } from '../validation/schemas.js'
import * as coursesService from '../services/coursesService.js'

export const list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeDeleted === 'true' || req.query.deleted === 'true'
  res.json(await coursesService.listCourses(req.user!.educationCenterId, includeInactive))
})

export const getOne = asyncHandler(async (req, res) => {
  res.json(await coursesService.getCourse(req.user!.educationCenterId, req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  const data = courseCreateSchema.parse(req.body)
  res.status(201).json(await coursesService.createCourse(req.user!.educationCenterId, data))
})

export const update = asyncHandler(async (req, res) => {
  const data = courseUpdateSchema.parse(req.body)
  res.json(await coursesService.updateCourse(req.user!.educationCenterId, req.params.id, data))
})

export const remove = asyncHandler(async (req, res) => {
  res.json(await coursesService.deactivateCourse(req.user!.educationCenterId, req.params.id))
})
