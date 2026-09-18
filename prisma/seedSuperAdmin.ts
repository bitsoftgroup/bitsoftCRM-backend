import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@bitsoft.local'
  const password = process.env.SEED_SUPERADMIN_PASSWORD || 'changeme'

  const existing = await prisma.superAdmin.findUnique({ where: { email } })
  if (existing) {
    console.log(`Superadmin ${email} already exists, skipping.`)
    return
  }

  await prisma.superAdmin.create({ data: { email, password } })
  console.log(`Created superadmin: ${email}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
