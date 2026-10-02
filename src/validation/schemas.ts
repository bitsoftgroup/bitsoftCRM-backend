import { z } from 'zod'

export const loginSchema = z.object({
  // Optional: only used as a fallback when no X-Tenant-Token header is sent
  // (the legacy browser-frontend path). The desktop app's tenant token takes precedence.
  centerSlug: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(1),
})

export const superAdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const educationCenterCreateSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  logoUrl: z.string().url().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  // Owner identity is asked for at creation because it is what gets printed on
  // this center's Contracts (as the signing director/owner name).
  ownerName: z.string().min(1),
  ownerPhone: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  // Required only on create: this center's first login (role 'admin'). Without it,
  // a newly created center has no User row and nobody can ever log into it.
  adminEmail: z.string().email(),
  adminPassword: z.string().min(1),
})
// Editing a center never touches its login credentials; a stray adminEmail/adminPassword
// must be dropped here, otherwise Prisma rejects them as unknown columns of EducationCenter.
export const educationCenterUpdateSchema = educationCenterCreateSchema
  .omit({ adminEmail: true, adminPassword: true })
  .partial()

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

export const discountsSchema = z.record(z.string(), z.number().min(0).max(100))

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

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const attendanceQuerySchema = z.object({
  groupId: z.string().min(1),
  date: isoDate.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
})

export const attendanceUpsertSchema = z.object({
  groupId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.record(z.string(), z.enum(['present', 'absent', 'late', 'excused'])),
})

// Superadmin read-only record lists (paginated, optionally scoped to one center).
export const recordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  educationCenterId: z.string().uuid().optional(),
  q: z.string().trim().max(120).default(''),
})

export const analyticsQuerySchema = z.object({ period: z.enum(['week', 'month', 'year']).default('month') })

export type LoginInput = z.infer<typeof loginSchema>
export type SuperAdminLoginInput = z.infer<typeof superAdminLoginSchema>
export type EducationCenterCreateInput = z.infer<typeof educationCenterCreateSchema>
export type EducationCenterUpdateInput = z.infer<typeof educationCenterUpdateSchema>
export type StudentCreateInput = z.infer<typeof studentCreateSchema>
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>
export type StudentDeleteInput = z.infer<typeof studentDeleteSchema>
export type GroupCreateInput = z.infer<typeof groupCreateSchema>
export type GroupUpdateInput = z.infer<typeof groupUpdateSchema>
export type CourseCreateInput = z.infer<typeof courseCreateSchema>
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>
export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>
export type ContractCreateInput = z.infer<typeof contractCreateSchema>
export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>
export type CashExpenseCreateInput = z.infer<typeof cashExpenseCreateSchema>
export type CashExpenseUpdateInput = z.infer<typeof cashExpenseUpdateSchema>
export type DiscountsInput = z.infer<typeof discountsSchema>
export type HolidaysInput = z.infer<typeof holidaysSchema>
export type RoomsInput = z.infer<typeof roomsSchema>
export type ContractInfoInput = z.infer<typeof contractInfoSchema>
export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>
export type AttendanceUpsertInput = z.infer<typeof attendanceUpsertSchema>
export type RecordsQuery = z.infer<typeof recordsQuerySchema>
