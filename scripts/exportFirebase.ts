// One-time export of the live Firebase Realtime Database into a local JSON snapshot,
// to be transformed and loaded by scripts/importPostgres.ts (AC-5). Requires
// FIREBASE_SERVICE_ACCOUNT_PATH and FIREBASE_DATABASE_URL to be set (see .env.example).
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'

const NODES = [
  'students',
  'groups',
  'courses',
  'teachers',
  'payments',
  'attendance',
  'contracts',
  'cashExpenses',
  'settings',
] as const

async function main() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const databaseURL = process.env.FIREBASE_DATABASE_URL
  if (!serviceAccountPath || !databaseURL) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_PATH and FIREBASE_DATABASE_URL before running this script.')
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
  initializeApp({ credential: cert(serviceAccount), databaseURL })
  const db = getDatabase()

  const snapshot: Record<string, unknown> = {}
  for (const node of NODES) {
    const ref = db.ref(node)
    const value = (await ref.get()).val()
    snapshot[node] = value ?? {}
    console.log(`Exported ${node}: ${value ? Object.keys(value).length : 0} entries`)
  }

  const outDir = path.resolve(import.meta.dirname, '../data')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, 'firebase-export.json')
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2))
  console.log(`Wrote snapshot to ${outFile}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
