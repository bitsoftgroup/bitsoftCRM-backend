import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const centerSlug = process.env.SEED_CENTER_SLUG || 'bitsoft'
  const centerName = process.env.SEED_CENTER_NAME || 'BitSoft'
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@bitsoft.local'
  const password = process.env.SEED_ADMIN_PASSWORD || 'changeme'

  const center = await prisma.educationCenter.upsert({
    where: { slug: centerSlug },
    create: { slug: centerSlug, name: centerName },
    update: {},
  })

  const existing = await prisma.user.findUnique({
    where: { educationCenterId_email: { educationCenterId: center.id, email } },
  })
  if (existing) {
    console.log(`Admin user ${email} already exists for center "${centerSlug}", skipping.`)
    return
  }

  await prisma.user.create({
    data: { educationCenterId: center.id, email, password, role: 'admin' },
  })
  console.log(`Created education center "${centerName}" (slug: ${centerSlug}) with first admin user: ${email}`)
  console.log('Set SEED_CENTER_SLUG / SEED_CENTER_NAME / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars to control this next time.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
