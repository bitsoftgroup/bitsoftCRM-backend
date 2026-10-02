import { asyncHandler } from '../utils/asyncHandler.js'
import { studentCreateSchema, studentDeleteSchema, studentUpdateSchema } from '../validation/schemas.js'
import * as studentsService from '../services/studentsService.js'

export const list = asyncHandler(async (req, res) => {
  const deleted = req.query.deleted === 'true'
  const includeDeleted = req.query.includeDeleted === 'true' || deleted
  res.json(await studentsService.listStudents(req.user!.educationCenterId, { deleted, includeDeleted }))
})

export const getOne = asyncHandler(async (req, res) => {
  res.json(await studentsService.getStudent(req.user!.educationCenterId, req.params.id))
})

export const create = asyncHandler(async (req, res) => {
  const data = studentCreateSchema.parse(req.body)
  res.status(201).json(await studentsService.createStudent(req.user!.educationCenterId, data))
})

export const update = asyncHandler(async (req, res) => {
  const data = studentUpdateSchema.parse(req.body)
  res.json(await studentsService.updateStudent(req.user!.educationCenterId, req.params.id, data))
})

export const remove = asyncHandler(async (req, res) => {
  const extra = studentDeleteSchema.parse(req.body ?? {})
  res.json(await studentsService.softDeleteStudent(req.user!.educationCenterId, req.params.id, extra))
})

export const debtStatus = asyncHandler(async (req, res) => {
  res.json(await studentsService.computeStudentDebtStatus(req.params.id, req.user!.educationCenterId))
})

export const restore = asyncHandler(async (req, res) => {
  res.json(await studentsService.restoreStudent(req.user!.educationCenterId, req.params.id))
})

export const removePermanently = asyncHandler(async (req, res) => {
  await studentsService.permanentlyDeleteStudent(req.user!.educationCenterId, req.params.id)
  res.status(204).end()
})

export const addToGroup = asyncHandler(async (req, res) => {
  res.json(await studentsService.addStudentToGroup(req.user!.educationCenterId, req.params.id, req.params.groupId))
})

export const removeFromGroup = asyncHandler(async (req, res) => {
  res.json(await studentsService.removeStudentFromGroup(req.user!.educationCenterId, req.params.id, req.params.groupId))
})
