import assert from 'node:assert/strict'
import test from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { Prisma } from '../generated/prisma/client.js'
import { HttpError } from '../src/utils/httpError.js'
import { errorHandler } from '../src/middleware/errorHandler.js'
import {
  attendanceQuerySchema,
  discountsSchema,
  educationCenterUpdateSchema,
} from '../src/validation/schemas.js'

function run(err: unknown) {
  const out = { status: 0, body: undefined as unknown }
  const res = {
    status(code: number) {
      out.status = code
      return res
    },
    json(body: unknown) {
      out.body = body
      return res
    },
  }
  errorHandler(err, { log: { error() {} } } as unknown as Request, res as unknown as Response, (() => {}) as NextFunction)
  return out
}

const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError('test', { code, clientVersion: 'test' })

test('malformed and oversized JSON bodies are client errors, not 500s', () => {
  assert.equal(run(Object.assign(new SyntaxError('bad'), { type: 'entity.parse.failed' })).status, 400)
  assert.equal(run(Object.assign(new Error('big'), { type: 'entity.too.large' })).status, 413)
})

test('HttpError and multer errors keep their own status and message', () => {
  assert.deepEqual(run(new HttpError(400, 'Only image uploads are allowed')), {
    status: 400,
    body: { error: 'Only image uploads are allowed' },
  })
  assert.equal(run(new multer.MulterError('LIMIT_FILE_SIZE')).status, 413)
  assert.equal(run(new multer.MulterError('LIMIT_UNEXPECTED_FILE')).status, 400)
})

test('prisma foreign key violations are conflicts and unknown errors stay 500', () => {
  assert.equal(run(prismaError('P2003')).status, 409)
  assert.equal(run(prismaError('P2002')).status, 409)
  assert.equal(run(prismaError('P2025')).status, 404)
  assert.equal(run(new Error('boom')).status, 500)
})

test('discount percentages must be between 0 and 100', () => {
  assert.equal(discountsSchema.safeParse({ 2: 10, 3: 100, 4: 0 }).success, true)
  assert.equal(discountsSchema.safeParse({ 2: 101 }).success, false)
  assert.equal(discountsSchema.safeParse({ 2: -1 }).success, false)
})

test('editing a center drops admin credentials instead of passing them to the database', () => {
  const parsed = educationCenterUpdateSchema.parse({ name: 'New', adminEmail: 'a@b.co', adminPassword: 'x' })
  assert.deepEqual(parsed, { name: 'New' })
})

test('attendance query requires a group and ISO dates', () => {
  assert.equal(attendanceQuerySchema.safeParse({ groupId: 'g', date: '2026-09-21' }).success, true)
  assert.equal(attendanceQuerySchema.safeParse({ groupId: 'g', date: 'abc' }).success, false)
  assert.equal(attendanceQuerySchema.safeParse({ date: '2026-09-21' }).success, false)
})
