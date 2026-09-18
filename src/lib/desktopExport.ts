import { spawn } from 'child_process'
import { mkdirSync, writeFileSync, rmSync, readdirSync, cpSync, existsSync } from 'fs'
import path from 'path'
import { prisma } from '../prisma.js'
import { env } from '../env.js'

const DESKTOP_PROJECT_DIR = path.resolve(process.cwd(), '..', 'desktop')
const EXPORTS_DIR = path.resolve(process.cwd(), 'exports')

// Only one electron-builder run at a time: the desktop/ project's tenant-config.json
// and dist/ output are shared, so concurrent builds would clobber each other.
let queue: Promise<void> = Promise.resolve()

export function enqueueExportJob(jobId: string, centerId: string) {
  queue = queue.then(() => runExportJob(jobId, centerId)).catch(() => {})
}

async function runExportJob(jobId: string, centerId: string) {
  await prisma.exportJob.update({ where: { id: jobId }, data: { status: 'building' } })
  try {
    const filePath = await buildDesktopApp(centerId)
    await prisma.exportJob.update({ where: { id: jobId }, data: { status: 'done', filePath } })
  } catch (err) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'failed', error: err instanceof Error ? err.message : 'Build failed' },
    })
  }
}

async function buildDesktopApp(centerId: string): Promise<string> {
  const center = await prisma.educationCenter.findUniqueOrThrow({ where: { id: centerId } })
  // A fresh token is minted on every export (the first one included) and the plaintext
  // is never shown or returned anywhere — it goes straight into the packaged app's config.
  const { generateTenantToken } = await import('./tenantToken.js')
  const { token, hash } = generateTenantToken()
  await prisma.educationCenter.update({ where: { id: centerId }, data: { tenantTokenHash: hash } })

  writeFileSync(
    path.join(DESKTOP_PROJECT_DIR, 'tenant-config.json'),
    JSON.stringify({ tenantToken: token, apiBaseUrl: env.DESKTOP_API_BASE_URL }, null, 2),
  )

  // Keeps the bundled renderer in sync with whatever frontend/dist currently holds.
  const frontendDist = path.resolve(process.cwd(), '..', 'frontend', 'dist')
  if (existsSync(frontendDist)) {
    rmSync(path.join(DESKTOP_PROJECT_DIR, 'frontend-dist'), { recursive: true, force: true })
    cpSync(frontendDist, path.join(DESKTOP_PROJECT_DIR, 'frontend-dist'), { recursive: true })
  }

  const buildOutDir = path.join(DESKTOP_PROJECT_DIR, 'dist')
  rmSync(buildOutDir, { recursive: true, force: true })

  // nsis produces a proper install-wizard .exe (Program Files, shortcuts, uninstaller),
  // not the "portable" single-file kind.
  await run('bunx', ['electron-builder', '--win', 'nsis', '--x64'], DESKTOP_PROJECT_DIR)

  const exeName = readdirSync(buildOutDir).find((f) => f.endsWith('.exe'))
  if (!exeName) throw new Error('electron-builder did not produce a .exe')

  const centerExportsDir = path.join(EXPORTS_DIR, center.id)
  mkdirSync(centerExportsDir, { recursive: true })
  const destPath = path.join(centerExportsDir, `${center.slug}-${Date.now()}.exe`)
  const { copyFileSync } = await import('fs')
  copyFileSync(path.join(buildOutDir, exeName), destPath)

  // electron-builder's scratch output (win-unpacked/ especially) runs to several
  // hundred MB per build and is worthless once the final .exe is copied out.
  rmSync(buildOutDir, { recursive: true, force: true })

  // Keep only the export just produced — a previous export for this same center
  // (e.g. from re-exporting after an edit) is now stale and just wastes disk.
  for (const file of readdirSync(centerExportsDir)) {
    if (file !== path.basename(destPath)) rmSync(path.join(centerExportsDir, file), { force: true })
  }

  return destPath
}

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'pipe' })
    let stderr = ''
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr.slice(-2000)}`))
    })
  })
}

export { EXPORTS_DIR }
