import { randomBytes } from 'crypto'
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'fs/promises'
import path from 'path'
import { env } from '../env.js'
import { HttpError } from '../utils/httpError.js'
import { readReleaseZip } from '../utils/zipRelease.js'
import type { ReleasePublishInput } from '../validation/schemas.js'

// Layout under DESKTOP_RELEASES_DIR:
//   blobs/<sha256>        every distinct file ever published (shared between releases)
//   releases/<n>.json     one manifest per release
//   current.json          { version } the release desktop apps should run
// Files are content-addressed, so a release that changes three files stores three new blobs
// and desktop apps only download those three.
const root = () => path.resolve(process.cwd(), env.DESKTOP_RELEASES_DIR)
const blobPath = (sha256: string) => path.join(root(), 'blobs', sha256)
const manifestPath = (version: string) => path.join(root(), 'releases', `${version}.json`)
const currentPath = () => path.join(root(), 'current.json')

export interface ReleaseManifest {
  version: string
  createdAt: string
  notes: string
  minShellVersion: string
  totalSize: number
  files: { path: string; sha256: string; size: number }[]
}

async function writeAtomic(file: string, data: string | Uint8Array) {
  const tmp = `${file}.${randomBytes(6).toString('hex')}.tmp`
  await writeFile(tmp, data)
  await rename(tmp, file)
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf-8')) as T
  } catch {
    return null
  }
}

// Publishing assigns the next version number, so two uploads must not interleave.
let publishQueue: Promise<unknown> = Promise.resolve()

export function publishRelease(zip: Uint8Array, input: ReleasePublishInput): Promise<ReleaseManifest> {
  const run = publishQueue.then(() => doPublish(zip, input))
  publishQueue = run.catch(() => {})
  return run
}

async function doPublish(zip: Uint8Array, { notes, minShellVersion, activate }: ReleasePublishInput) {
  const files = readReleaseZip(zip)
  await mkdir(path.join(root(), 'blobs'), { recursive: true })
  await mkdir(path.join(root(), 'releases'), { recursive: true })

  for (const file of files) {
    const target = blobPath(file.sha256)
    if (!(await stat(target).catch(() => null))) await writeAtomic(target, file.data)
  }

  const existing = (await readdir(path.join(root(), 'releases'))).map((name) => Number.parseInt(name, 10)).filter(Number.isFinite)
  const manifest: ReleaseManifest = {
    version: String(Math.max(0, ...existing) + 1),
    createdAt: new Date().toISOString(),
    notes,
    minShellVersion,
    totalSize: files.reduce((sum, file) => sum + file.data.length, 0),
    files: files.map((file) => ({ path: file.path, sha256: file.sha256, size: file.data.length })),
  }
  await writeAtomic(manifestPath(manifest.version), JSON.stringify(manifest, null, 2))
  if (activate) await writeAtomic(currentPath(), JSON.stringify({ version: manifest.version }))
  return manifest
}

export async function getCurrentVersion(): Promise<string | null> {
  return (await readJson<{ version: string }>(currentPath()))?.version ?? null
}

export async function getCurrentManifest(): Promise<ReleaseManifest | null> {
  const version = await getCurrentVersion()
  return version && /^\d+$/.test(version) ? readJson<ReleaseManifest>(manifestPath(version)) : null
}

export async function listReleases() {
  const current = await getCurrentVersion()
  const names = await readdir(path.join(root(), 'releases')).catch(() => [] as string[])
  const manifests = await Promise.all(
    names.filter((name) => /^\d+\.json$/.test(name)).map((name) => readJson<ReleaseManifest>(path.join(root(), 'releases', name))),
  )
  return manifests
    .filter((manifest): manifest is ReleaseManifest => manifest !== null)
    .sort((a, b) => Number(b.version) - Number(a.version))
    .map(({ files, ...rest }) => ({ ...rest, fileCount: files.length, isCurrent: rest.version === current }))
}

/** Makes an existing release the one desktop apps run: also how to roll back a bad release. */
export async function activateRelease(version: string) {
  if (!/^\d+$/.test(version) || !(await stat(manifestPath(version)).catch(() => null))) {
    throw new HttpError(404, 'Release not found')
  }
  await writeAtomic(currentPath(), JSON.stringify({ version }))
}

/** Absolute path of a published file by content hash, or null if there is none. */
export async function findBlob(sha256: string): Promise<string | null> {
  if (!/^[0-9a-f]{64}$/.test(sha256)) return null
  const file = blobPath(sha256)
  return (await stat(file).catch(() => null)) ? file : null
}
