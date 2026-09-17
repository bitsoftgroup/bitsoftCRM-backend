import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const studentCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  parentPhone: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  status: z.enum(['active', 'frozen', 'graduated', 'dropped', 'pending']).optional(),
  dueDay: z.number().int().min(1).max(31),
  interestCourseId: z.string().uuid().optional(),
  notes: z.string().optional(),
})
export const studentUpdateSchema = studentCreateSchema.partial()

export const studentDeleteSchema = z.object({
  deleteNote: z.string().optional(),
  deleteBalanceType: z.enum(['debt', 'credit']).optional(),
  deleteBalanceAmount: z.number().optional(),
})

export const groupCreateSchema = z.object({
  name: z.string().min(1),
  courseId: z.string().uuid(),
  teacherId: z.string().uuid(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  maxStudents: z.number().int().positive().optional(),
  scheduleDays: z.array(z.string()).optional(),
  scheduleTime: z.string().optional(),
  scheduleDurationMinutes: z.number().int().positive().optional(),
  room: z.string().optional(),
})
export const groupUpdateSchema = groupCreateSchema.partial()

export const courseCreateSchema = z.object({
  name: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'pro']),
  price: z.number().nonnegative(),
  courseStatus: z.enum(['active', 'planned']).optional(),
})
export const courseUpdateSchema = courseCreateSchema.partial()

export const teacherCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
})
export const teacherUpdateSchema = teacherCreateSchema.partial()

export const paymentCreateSchema = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  amount: z.number(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  dueDay: z.number().int().min(1).max(31).optional(),
  paidDate: z.coerce.date().optional(),
  method: z.enum(['cash', 'card', 'transfer']),
  status: z.enum(['paid', 'partial', 'debt']),
  discount: z.number().optional(),
  originalPrice: z.number().optional(),
  notes: z.string().optional(),
})
export const paymentUpdateSchema = paymentCreateSchema.partial()

export const contractCreateSchema = z.object({
  studentId: z.string().uuid(),
  groupId: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  address: z.string().optional(),
  centerPhone: z.string().optional(),
  centerName: z.string().optional(),
  directorName: z.string().optional(),
  studentName: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  phone: z.string().optional(),
  parentPhone: z.string().optional(),
  courseName: z.string().optional(),
  groupName: z.string().optional(),
  price: z.number().optional(),
  graceDays: z.number().int().optional(),
  startDate: z.coerce.date().optional(),
  signDate: z.coerce.date().optional(),
})
export const contractUpdateSchema = contractCreateSchema.partial()

export const cashExpenseCreateSchema = z.object({
  category: z.enum(['rent', 'utilities', 'salary', 'supplies', 'other']),
  amount: z.number(),
  date: z.coerce.date(),
  note: z.string().optional(),
})
export const cashExpenseUpdateSchema = cashExpenseCreateSchema.partial()

export const discountsSchema = z.record(z.string(), z.number())

export const holidaysSchema = z.array(z.object({ from: z.string(), to: z.string() }))

export const roomsSchema = z.array(z.string())

export const contractInfoSchema = z.object({
  centerName: z.string(),
  directorName: z.string(),
  address: z.string(),
  phone: z.string(),
  graceDays: z.number().int(),
})

export const cashOpeningBalanceSchema = z.object({
  amount: z.number(),
})

export const attendanceUpsertSchema = z.object({
  groupId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.record(z.string(), z.enum(['present', 'absent', 'late', 'excused'])),
})
