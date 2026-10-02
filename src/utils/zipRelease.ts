import { createHash } from 'crypto'
import { unzipSync } from 'fflate'
import { HttpError } from './httpError.js'

export const MAX_RELEASE_FILES = 2000
export const MAX_RELEASE_BYTES = 300 * 1024 * 1024

export interface ReleaseFile {
  path: string
  data: Uint8Array
  sha256: string
}

const JUNK = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$)/

/** Normalises one zip entry name to a safe relative path, or throws. */
function safePath(raw: string): string {
  const name = raw.replace(/\\/g, '/').replace(/^\.\//, '')
  const segments = name.split('/')
  const bad =
    name.length === 0 ||
    name.length > 200 ||
    name.startsWith('/') ||
    /^[A-Za-z]:/.test(name) ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f:*?"<>|]/.test(name) ||
    segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  if (bad) throw new HttpError(400, `Unsafe file path in zip: ${raw.slice(0, 80)}`)
  return name
}

/**
 * Reads an uploaded frontend build (a zip of the Vite `dist` folder) into validated files.
 * Accepts the contents zipped directly or inside a single top-level folder. Rejects path
 * traversal, case-colliding names (Windows is case-insensitive), oversized archives, and
 * anything without an index.html at its root.
 */
export function readReleaseZip(buffer: Uint8Array): ReleaseFile[] {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw new HttpError(400, 'Not a zip file')

  let count = 0
  let total = 0
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(buffer, {
      filter: (file) => {
        if (file.name.endsWith('/') || JUNK.test(file.name)) return false
        count += 1
        total += file.originalSize
        if (count > MAX_RELEASE_FILES) throw new HttpError(400, `Zip has more than ${MAX_RELEASE_FILES} files`)
        if (total > MAX_RELEASE_BYTES) throw new HttpError(400, 'Zip is too large when unpacked')
        return true
      },
    })
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(400, 'Invalid or corrupted zip file')
  }

  let names = Object.keys(entries).map((raw) => ({ raw, path: safePath(raw) }))
  if (!names.some((entry) => entry.path === 'index.html')) {
    const tops = new Set(names.map((entry) => entry.path.split('/')[0]))
    if (tops.size === 1 && names.every((entry) => entry.path.includes('/'))) {
      names = names.map((entry) => ({ raw: entry.raw, path: entry.path.slice(entry.path.indexOf('/') + 1) }))
    }
  }
  if (!names.some((entry) => entry.path === 'index.html')) {
    throw new HttpError(400, 'Zip must contain index.html at its top level (zip the contents of the dist folder)')
  }

  const seen = new Set<string>()
  const files = names.map(({ raw, path }) => {
    const key = path.toLowerCase()
    if (seen.has(key)) throw new HttpError(400, `Duplicate file path in zip: ${path}`)
    seen.add(key)
    const data = entries[raw]
    return { path, data, sha256: createHash('sha256').update(data).digest('hex') }
  })
  return files.sort((a, b) => a.path.localeCompare(b.path))
}
