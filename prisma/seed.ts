import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@bitsoft.local'
  const password = process.env.SEED_ADMIN_PASSWORD || 'changeme'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin user ${email} already exists, skipping.`)
    return
  }

  await prisma.user.create({
    data: { email, password, role: 'admin' },
  })
  console.log(`Created first admin user: ${email}`)
  console.log('Set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars to control credentials next time.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
