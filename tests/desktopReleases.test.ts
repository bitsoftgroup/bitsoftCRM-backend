import assert from 'node:assert/strict'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import express from 'express'
import { strToU8, zipSync } from 'fflate'

process.env.DATABASE_URL ??= 'postgresql://test'
process.env.JWT_SECRET ??= 'test-secret'
process.env.DESKTOP_RELEASES_DIR = mkdtempSync(path.join(tmpdir(), 'releases-'))

const { readReleaseZip } = await import('../src/utils/zipRelease.js')
const { HttpError } = await import('../src/utils/httpError.js')
const releaseService = await import('../src/services/desktopReleaseService.js')
const { default: desktopRoutes } = await import('../src/routes/desktop.js')
const { errorHandler } = await import('../src/middleware/errorHandler.js')

const zipOf = (files: Record<string, string>) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])))
const rejects = (zip: Uint8Array, pattern: RegExp) =>
  assert.throws(() => readReleaseZip(zip), (error: unknown) => error instanceof HttpError && error.status === 400 && pattern.test(error.message))

test('a zip of the dist contents is read with hashes', () => {
  const files = readReleaseZip(zipOf({ 'index.html': '<div id=root>', 'assets/app.js': 'x' }))
  assert.deepEqual(files.map((file) => file.path), ['assets/app.js', 'index.html'])
  assert.equal(files[0].sha256, '2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881')
})

test('a zip of the dist folder itself is unwrapped, and mac junk is ignored', () => {
  const files = readReleaseZip(zipOf({ 'dist/index.html': 'a', 'dist/assets/a.js': 'b', '__MACOSX/dist/._index.html': 'junk', 'dist/.DS_Store': 'junk' }))
  assert.deepEqual(files.map((file) => file.path), ['assets/a.js', 'index.html'])
})

test('unsafe, incomplete or broken zips are rejected', () => {
  rejects(zipOf({ 'index.html': 'a', '../evil.js': 'b' }), /Unsafe file path/)
  rejects(zipOf({ 'index.html': 'a', '/etc/passwd': 'b' }), /Unsafe file path/)
  rejects(zipOf({ 'index.html': 'a', 'C:/x.js': 'b' }), /Unsafe file path/)
  rejects(zipOf({ 'a.html': 'a' }), /index\.html/)
  rejects(zipOf({ 'index.html': 'a', 'App.js': 'b', 'app.js': 'c' }), /Duplicate/)
  rejects(strToU8('definitely not a zip'), /Not a zip/)
  rejects(new Uint8Array([0x50, 0x4b, 1, 2, 3, 4, 5]), /corrupted/)
})

test('publishing stores files by hash, numbers releases, and only changed files are new blobs', async () => {
  const first = await releaseService.publishRelease(zipOf({ 'index.html': 'v1', 'assets/a.js': 'same' }), { notes: 'first', minShellVersion: '1.1.0', activate: true })
  const second = await releaseService.publishRelease(zipOf({ 'index.html': 'v2', 'assets/a.js': 'same' }), { notes: '', minShellVersion: '1.1.0', activate: false })
  assert.deepEqual([first.version, second.version], ['1', '2'])
  const shared = (m: typeof first) => m.files.find((file) => file.path === 'assets/a.js')!.sha256
  assert.equal(shared(first), shared(second))
  assert.ok(await releaseService.findBlob(shared(first)))
  assert.equal((await releaseService.getCurrentManifest())?.version, '1')

  await releaseService.activateRelease('2')
  assert.equal((await releaseService.getCurrentManifest())?.version, '2')
  await assert.rejects(releaseService.activateRelease('99'), (e: unknown) => e instanceof HttpError && e.status === 404)
  await assert.rejects(releaseService.activateRelease('../current'), (e: unknown) => e instanceof HttpError && e.status === 404)

  const listed = await releaseService.listReleases()
  assert.deepEqual(listed.map((r) => [r.version, r.isCurrent, r.fileCount]), [['2', true, 2], ['1', false, 2]])
  assert.equal(await releaseService.findBlob('../../etc/passwd'), null)
  assert.equal(await releaseService.findBlob('0'.repeat(64)), null)
  assert.ok(existsSync(process.env.DESKTOP_RELEASES_DIR!))
})

test('desktop endpoints require a tenant token and serve the current manifest and blobs', async () => {
  const app = express()
  app.use((req, _res, next) => { if (req.headers['x-test-tenant']) req.tenantCenterId = 'center-1'; next() })
  app.use('/desktop', desktopRoutes)
  app.use(errorHandler)
  const server = app.listen(0)
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/desktop/ui`
    assert.equal((await fetch(`${base}/manifest`)).status, 401)
    const manifest = await (await fetch(`${base}/manifest`, { headers: { 'x-test-tenant': '1' } })).json() as { version: string; files: { sha256: string }[] }
    assert.equal(manifest.version, '2')
    const blob = await fetch(`${base}/blobs/${manifest.files[0].sha256}`, { headers: { 'x-test-tenant': '1' } })
    assert.equal(blob.status, 200)
    assert.equal((await fetch(`${base}/blobs/nothex`, { headers: { 'x-test-tenant': '1' } })).status, 404)
  } finally {
    server.close()
  }
})
