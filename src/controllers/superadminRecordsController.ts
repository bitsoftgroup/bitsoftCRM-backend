import { asyncHandler } from '../utils/asyncHandler.js'
import { recordsQuerySchema } from '../validation/schemas.js'
import * as records from '../services/superadminRecordsService.js'

export const students = asyncHandler(async (req, res) => {
  res.json(await records.listStudents(recordsQuerySchema.parse(req.query)))
})

export const payments = asyncHandler(async (req, res) => {
  res.json(await records.listPayments(recordsQuerySchema.parse(req.query)))
})

export const attendance = asyncHandler(async (req, res) => {
  res.json(await records.listAttendance(recordsQuerySchema.parse(req.query)))
})

export const teachers = asyncHandler(async (req, res) => {
  res.json(await records.listTeachers(recordsQuerySchema.parse(req.query)))
})

export const groups = asyncHandler(async (req, res) => {
  res.json(await records.listGroups(recordsQuerySchema.parse(req.query)))
})

export const courses = asyncHandler(async (req, res) => {
  res.json(await records.listCourses(recordsQuerySchema.parse(req.query)))
})

export const contracts = asyncHandler(async (req, res) => {
  res.json(await records.listContracts(recordsQuerySchema.parse(req.query)))
})

export const cashExpenses = asyncHandler(async (req, res) => {
  res.json(await records.listCashExpenses(recordsQuerySchema.parse(req.query)))
})
