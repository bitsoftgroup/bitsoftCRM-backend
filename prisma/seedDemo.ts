import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function todayLocalMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('Seeding demo dataset...')

  const centerSlug = process.env.DEMO_CENTER_SLUG || 'demo'
  const center = await prisma.educationCenter.upsert({
    where: { slug: centerSlug },
    create: { slug: centerSlug, name: 'BitSoft (Demo)' },
    update: {},
  })
  const educationCenterId = center.id
  console.log(`Seeding into education center "${center.name}" (slug: ${centerSlug})`)

  // Settings
  await prisma.settings.upsert({
    where: { educationCenterId },
    create: {
      educationCenterId,
      discounts: { '2': 10, '3': 15, '4': 20 },
      holidays: [{ from: '2026-01-01', to: '2026-01-02' }],
      rooms: ['101', '102', '103', '201'],
      contractInfo: {
        centerName: 'BitSoft',
        directorName: 'Бурхонов У.И.',
        address: 'ноҳияи Ҷаббор Расулов, ҷамоати деҳаи Гулакандоз, кӯчаи А. Ҷомӣ, 1',
        phone: '+992 000 00 00 00',
        graceDays: 5,
      },
      cashOpeningBalance: 5000,
    },
    update: {},
  })
  console.log('Settings ready')

  // Teachers
  const teacherNames = ['Азимова Нилуфар', 'Раҳимов Фаррух', 'Каримова Зарина', 'Юсупов Далер', 'Шарипова Мадина']
  const teachers = []
  for (const name of teacherNames) {
    const teacher = await prisma.teacher.create({
      data: { educationCenterId, name, phone: `+992 90 ${Math.floor(1000000 + Math.random() * 8999999)}` },
    })
    teachers.push(teacher)
  }
  console.log(`Created ${teachers.length} teachers`)

  // Courses
  const courseDefs = [
    { name: 'English A1', level: 'beginner' as const, price: 300 },
    { name: 'English B1', level: 'intermediate' as const, price: 350 },
    { name: 'English Pro', level: 'pro' as const, price: 400 },
    { name: 'Математика', level: 'beginner' as const, price: 280 },
    { name: 'IT & Программирование', level: 'intermediate' as const, price: 380 },
    { name: 'Робототехника', level: 'pro' as const, price: 320, planned: true },
  ]
  const courses = []
  for (const def of courseDefs) {
    const course = await prisma.course.create({
      data: {
        educationCenterId,
        name: def.name,
        level: def.level,
        price: def.price,
        courseStatus: (def as { planned?: boolean }).planned ? 'planned' : 'active',
      },
    })
    courses.push(course)
  }
  console.log(`Created ${courses.length} courses`)

  // Groups
  const dayCombos = [
    ['monday', 'wednesday', 'friday'],
    ['tuesday', 'thursday'],
    ['monday', 'wednesday'],
    ['saturday'],
  ]
  const groupDefs = [
    { name: 'A1-Утро', courseIdx: 0, teacherIdx: 0, time: '09:00', room: '101' },
    { name: 'A1-Вечер', courseIdx: 0, teacherIdx: 1, time: '17:00', room: '102' },
    { name: 'B1-Утро', courseIdx: 1, teacherIdx: 1, time: '10:00', room: '101' },
    { name: 'Pro-Вечер', courseIdx: 2, teacherIdx: 0, time: '18:00', room: '201' },
    { name: 'Математика-1', courseIdx: 3, teacherIdx: 2, time: '11:00', room: '102' },
    { name: 'Математика-2', courseIdx: 3, teacherIdx: 2, time: '15:00', room: '103' },
    { name: 'IT-Вечер', courseIdx: 4, teacherIdx: 3, time: '16:00', room: '201' },
    { name: 'Суббота-Клуб', courseIdx: 4, teacherIdx: 4, time: '10:00', room: '103' },
  ]
  const groups = []
  for (const def of groupDefs) {
    const group = await prisma.group.create({
      data: {
        educationCenterId,
        name: def.name,
        courseId: courses[def.courseIdx].id,
        teacherId: teachers[def.teacherIdx].id,
        scheduleDays: pick(dayCombos),
        scheduleTime: def.time,
        scheduleDurationMinutes: 90,
        room: def.room,
        maxStudents: 15,
      },
    })
    groups.push(group)
  }
  console.log(`Created ${groups.length} groups`)

  // Users linked to two teachers, plus one reception user
  await prisma.user.create({
    data: { educationCenterId, email: 'teacher1@bitsoft.local', password: 'changeme', role: 'teacher', teacherId: teachers[0].id },
  })
  await prisma.user.create({
    data: { educationCenterId, email: 'teacher2@bitsoft.local', password: 'changeme', role: 'teacher', teacherId: teachers[1].id },
  })
  await prisma.user.create({
    data: { educationCenterId, email: 'reception@bitsoft.local', password: 'changeme', role: 'reception' },
  })
  console.log('Created teacher/reception user accounts (password: changeme)')

  // Students
  const firstNames = ['Амир', 'Малика', 'Сомон', 'Дилноза', 'Ҳасан', 'Зухра', 'Фаридун', 'Гулнора', 'Ориф', 'Шабнам']
  const lastNames = ['Раҳимов', 'Каримова', 'Юсупов', 'Азимова', 'Насриддинов', 'Холова', 'Бобоев', 'Сафарова']
  const statuses: Array<'active' | 'frozen' | 'graduated' | 'dropped' | 'pending'> = [
    'active', 'active', 'active', 'active', 'active', 'active', 'active', 'frozen', 'pending', 'dropped',
  ]
  const students = []
  for (let i = 0; i < 25; i++) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`
    const student = await prisma.student.create({
      data: {
        educationCenterId,
        name,
        phone: `+992 91 ${Math.floor(1000000 + Math.random() * 8999999)}`,
        parentPhone: `+992 92 ${Math.floor(1000000 + Math.random() * 8999999)}`,
        status: pick(statuses),
        dueDay: 1 + Math.floor(Math.random() * 28),
        interestCourseId: Math.random() < 0.3 ? pick(courses).id : null,
        enrolledAt: new Date(Date.now() - Math.floor(Math.random() * 300) * 86400000),
      },
    })
    students.push(student)
  }
  console.log(`Created ${students.length} students`)

  // Enroll active students into 1-2 groups each
  const activeStudents = students.filter((s) => s.status === 'active')
  for (const student of activeStudents) {
    const groupCount = Math.random() < 0.25 ? 2 : 1
    const chosen = [...groups].sort(() => Math.random() - 0.5).slice(0, groupCount)
    for (const group of chosen) {
      await prisma.studentGroup.create({ data: { studentId: student.id, groupId: group.id } })
    }
  }
  console.log('Enrolled active students into groups')

  // Payments for the current month: paid / partial / debt, plus some silently missing
  const month = todayLocalMonth()
  const memberships = await prisma.studentGroup.findMany({
    where: { student: { educationCenterId } },
    include: { group: { include: { course: true } } },
  })
  let paymentCount = 0
  for (const m of memberships) {
    const roll = Math.random()
    if (roll < 0.15) continue // silent debtor: no payment row at all
    const price = Number(m.group.course.price)
    const status: 'paid' | 'partial' | 'debt' = roll < 0.65 ? 'paid' : roll < 0.85 ? 'partial' : 'debt'
    const amount = status === 'paid' ? price : status === 'partial' ? Math.round(price * 0.5) : 0
    await prisma.payment.create({
      data: {
        educationCenterId,
        studentId: m.studentId,
        groupId: m.groupId,
        amount,
        month,
        dueDay: 10,
        method: pick(['cash', 'card', 'transfer'] as const),
        status,
        originalPrice: price,
      },
    })
    paymentCount++
  }
  console.log(`Created ${paymentCount} payments for ${month}`)

  // Contracts for about a third of active students
  const contractYear = new Date().getFullYear()
  const existingCounter = await prisma.contractYearCounter.findUnique({
    where: { educationCenterId_year: { educationCenterId, year: contractYear } },
  })
  let contractCounter = existingCounter?.counter ?? 0
  const contractInfo = {
    centerName: 'BitSoft',
    directorName: 'Бурхонов У.И.',
    address: 'ноҳияи Ҷаббор Расулов, ҷамоати деҳаи Гулакандоз, кӯчаи А. Ҷомӣ, 1',
  }
  for (const student of activeStudents) {
    if (Math.random() > 0.35) continue
    const enrolled = memberships.find((m) => m.studentId === student.id)
    if (!enrolled) continue
    contractCounter++
    await prisma.contract.create({
      data: {
        educationCenterId,
        studentId: student.id,
        groupId: enrolled.groupId,
        courseId: enrolled.group.courseId,
        contractNumber: `${contractCounter}/${contractYear}`,
        studentName: student.name,
        phone: student.phone,
        parentPhone: student.parentPhone,
        courseName: enrolled.group.course.name,
        groupName: enrolled.group.name,
        price: enrolled.group.course.price,
        graceDays: 5,
        startDate: new Date(),
        signDate: new Date(),
        centerName: contractInfo.centerName,
        directorName: contractInfo.directorName,
        address: contractInfo.address,
      },
    })
  }
  await prisma.contractYearCounter.upsert({
    where: { educationCenterId_year: { educationCenterId, year: contractYear } },
    create: { educationCenterId, year: contractYear, counter: contractCounter },
    update: { counter: contractCounter },
  })
  console.log(`Created ${contractCounter} contracts for ${contractYear}`)

  // Attendance: last 4 occurrences per group, marked for its enrolled students
  let attendanceCount = 0
  for (const group of groups) {
    const roster = memberships.filter((m) => m.groupId === group.id)
    if (!roster.length) continue
    for (let dayOffset = 0; dayOffset < 28; dayOffset += 7) {
      const date = new Date()
      date.setDate(date.getDate() - dayOffset)
      const records: Record<string, string> = {}
      for (const m of roster) {
        records[m.studentId] = pick(['present', 'present', 'present', 'absent', 'late', 'excused'])
      }
      await prisma.attendance.create({ data: { educationCenterId, groupId: group.id, date, records } })
      attendanceCount++
    }
  }
  console.log(`Created ${attendanceCount} attendance records`)

  // Cash expenses over the last month
  const expenseDefs: Array<{ category: 'rent' | 'utilities' | 'salary' | 'supplies' | 'other'; amount: number; note: string }> = [
    { category: 'rent', amount: 3000, note: 'Ижара за месяц' },
    { category: 'utilities', amount: 450, note: 'Свет и вода' },
    { category: 'salary', amount: 4200, note: 'Зарплата преподавателям' },
    { category: 'supplies', amount: 180, note: 'Канцелярия' },
    { category: 'other', amount: 90, note: 'Прочее' },
  ]
  for (const [i, def] of expenseDefs.entries()) {
    const date = new Date()
    date.setDate(date.getDate() - i * 3)
    await prisma.cashExpense.create({ data: { ...def, educationCenterId, date } })
  }
  console.log(`Created ${expenseDefs.length} cash expenses`)

  console.log('Demo dataset seeded.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
