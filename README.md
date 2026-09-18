# BitsoftCRM backend

Express + TypeScript API backed by PostgreSQL via Prisma. Implements
[docs/specs/backend/0001-backend-service-architecture/index.md](../docs/specs/backend/0001-backend-service-architecture/index.md), Track A.

## Setup

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`.
2. `npm install`
3. `npm run prisma:migrate` (creates the database schema)
4. `npm run seed` (creates the first admin user; set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars first, or use the printed defaults)
5. `npm run dev`

## One-time Firebase migration (AC-5)

1. Set `FIREBASE_SERVICE_ACCOUNT_PATH` and `FIREBASE_DATABASE_URL` in `.env`.
2. `npm run firebase:export` writes `data/firebase-export.json`.
3. `npm run postgres:import` loads that snapshot into Postgres, remapping every Firebase push ID to a new UUID and preserving all relationships.

## Notes

- Passwords are stored and compared as plain text (see the Premise note in the spec) — an explicit, accepted risk, not an oversight. Follow-up item: turn on password hashing before this is exposed to real users.
- All endpoints are prefixed `/api/v1` and (aside from `/api/v1/auth/login`) require a `Authorization: Bearer <token>` header.

## API contract (for Track B / `frontend/src/services/*.js`)

General rules that apply to every resource below:

- Money and price fields (`amount`, `price`, `discount`, `originalPrice`, `deleteBalanceAmount`, `cashOpeningBalance`) are Prisma `Decimal` columns and are serialized as **strings**, e.g. `"300"`, not the number `300`. Parse with `Number(...)` on the frontend before doing math or formatting.
- All `id` fields are UUID strings, generated server-side. Never send an `id` in a create body.
- Dates/timestamps (`enrolledAt`, `paidAt`, `createdAt`, `updatedAt`, `deletedAt`, `birthDate`, `date`, `startDate`, `endDate`, `signDate`) are ISO 8601 strings, e.g. `"2026-09-17T07:50:36.515Z"`.
- Standard CRUD list endpoints return a bare JSON array, not `{ data: [...] }`.
- Errors: `400` `{ "error": "Validation failed", "details": {...zod flatten...} }`; `401` `{ "error": "..." }`; `403` `{ "error": "..." }`; `404` `{ "error": "Not found" }`; `409` `{ "error": "Conflict: duplicate value", "meta": {...} }`.
- Soft-delete list endpoints default to excluding deleted/inactive rows; pass `?deleted=true` (students, payments, cash-expenses) to see only the deleted ones, or `?includeDeleted=true` (groups, courses, teachers) to see all.

### Auth

- `POST /api/v1/auth/login` — body `{ email, password }` → `{ token, role, teacherId }` (`teacherId` is `null` unless `role === "teacher"`). 401 on bad credentials.
- `GET /api/v1/auth/me` — bearer → `{ id, email, role, teacherId }`.

### Students

- `Student` shape: `{ id, name, phone, parentPhone, birthDate, status, dueDay, interestCourseId, notes, enrolledAt, deleted, deletedAt, deleteNote, deleteBalanceType, deleteBalanceAmount, groups: [{ studentId, groupId }], groupIds: [groupId, ...] }`. `groupIds` is a convenience array derived from `groups` — use it exactly like the old Firebase `groupIds` field.
- `GET /students`, `GET /students/:id`, `POST /students` (body: `name`, `dueDay` required; `phone`, `parentPhone`, `birthDate`, `status`, `interestCourseId`, `notes` optional), `PATCH /students/:id` (any subset of the same fields).
- `DELETE /students/:id` — body optional: `{ deleteNote?, deleteBalanceType?: "debt"|"credit", deleteBalanceAmount? }`.
- `POST /students/:id/restore`, `DELETE /students/:id/permanent`.
- `POST /students/:id/groups/:groupId`, `DELETE /students/:id/groups/:groupId` — both return the updated student (same shape as above).
- `GET /students/:id/debt-status` → `{ status: "paid"|"partial"|"debt"|"credit", balance: number }`. `balance` is negative when the student owes money, positive when they've overpaid. Computed server-side from the student's active-group payments for the current month; no request body/query needed.

### Groups

- `Group` shape: `{ id, name, courseId, teacherId, startDate, endDate, maxStudents, scheduleDays: string[], scheduleTime, scheduleDurationMinutes, room, isActive }`. Note: no nested `schedule: { days, time }` object like the old Firebase shape — `scheduleDays`/`scheduleTime`/`scheduleDurationMinutes` are flat fields.
- `GET /groups` — admin/reception see all (or all-including-inactive with `?includeDeleted=true`); a teacher token only ever sees their own groups (server-filtered, not a client concern).
- `GET /groups/:id`, `POST /groups` (admin/reception; body: `name`, `courseId`, `teacherId` required, rest optional), `PATCH /groups/:id` (admin/reception), `DELETE /groups/:id` (admin/reception; soft delete via `isActive: false`, no restore endpoint — matches today).

### Courses

- `Course` shape: `{ id, name, level, price, courseStatus, isActive }`. `price` is a decimal string.
- Standard CRUD at `/courses`, admin/reception only, soft delete via `isActive`.

### Teachers

- `Teacher` shape: `{ id, name, phone, isActive }`.
- `GET /teachers`, `GET /teachers/:id`: admin/reception. `POST/PATCH/DELETE /teachers`: admin only. Soft delete via `isActive`.

### Payments

- `Payment` shape: `{ id, studentId, groupId, amount, month, dueDay, paidDate, paidAt, method, status, discount, originalPrice, notes, deleted }`. `month` is `"YYYY-MM"`. `status` is `"paid"|"partial"|"debt"`. `method` is `"cash"|"card"|"transfer"`.
- Standard CRUD at `/payments`, admin/reception only. `POST` body: `studentId`, `amount`, `month`, `method`, `status` required; `groupId`, `dueDay`, `paidDate`, `discount`, `originalPrice`, `notes` optional. `paidAt` is always set server-side to the current time, not client-supplied. Soft delete only (`deleted: true`), no restore.

### Contracts

- `Contract` shape: `{ id, studentId, groupId, courseId, contractNumber, address, centerPhone, centerName, directorName, studentName, birthDate, phone, parentPhone, courseName, groupName, price, graceDays, startDate, signDate, createdAt, updatedAt }`.
- `GET /contracts`, `GET /contracts/:id`, `POST /contracts` (body: `studentId`, `courseId` required, rest optional snapshot fields; `contractNumber` is always assigned server-side, atomically, per AC-4 — never send it), `PATCH /contracts/:id`, `DELETE /contracts/:id` (hard delete, matches today — no restore).
- `GET /contracts/next-number` → `{ contractNumber: "N/YYYY" }`. This is a **peek**, not a reservation: it shows what the next number _would_ be right now, but calling `POST /contracts` is what actually assigns and consumes it. Two clients peeking at the same time can see the same number; only the `POST` is atomic. Use this purely for UI preview text, not as a value you send back to the server.

### Cash expenses

- `CashExpense` shape: `{ id, category, amount, date, note, createdAt, deleted, deletedAt }`. `category` is `"rent"|"utilities"|"salary"|"supplies"|"other"`.
- Standard CRUD at `/cash-expenses` plus `POST /cash-expenses/:id/restore`, `DELETE /cash-expenses/:id/permanent`. Admin only.

### Settings

All admin only, all `GET`/`PUT` (full overwrite):

- `GET/PUT /settings/discounts` → body/response is the raw map, e.g. `{ "2": 10, "3": 15, "4": 20 }` (**keys are strings**, not numbers — `JSON.stringify` on the frontend already does this, but read them back with `Number(key)` when comparing).
- `GET/PUT /settings/holidays` → array of `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }`.
- `GET/PUT /settings/rooms` → array of strings.
- `GET/PUT /settings/contract-info` → `{ centerName, directorName, address, phone, graceDays }` (all required on `PUT`, no partial update).
- `GET/PUT /settings/cash-opening-balance` → `{ amount: number }` (note: this one is wrapped in an object, unlike the others which are the bare value/array/map).

### Attendance

- `Attendance` shape: `{ id, groupId, date, records: { [studentId]: "present"|"absent"|"late"|"excused" }, updatedAt }`.
- `GET /attendance?groupId=...&date=YYYY-MM-DD` (single day) or `?groupId=...&from=YYYY-MM-DD&to=YYYY-MM-DD` (range) → array of matching records. `groupId` is required either way.
- `PUT /attendance` — body `{ groupId, date: "YYYY-MM-DD", records }` → upserted record (same shape). `updatedAt` is always server clock, never client-supplied.
- Teacher tokens get 403 on both verbs if `groupId` isn't one of their own groups (checked server-side against `Group.teacherId`).

### Reports

- `GET /reports/todays-classes` → `{ count: number }`. "Today" is the server's clock/day-of-week, never client-supplied. For a teacher token, `count` is scoped to their own groups only.

### Holiday / missed-lesson calculation — no new endpoint needed

The spec's API surface table doesn't list a `/holidays/missed-lessons`-style endpoint, and none was added, because the calculation (`countHolidayDays`, `countMissedLessons` in `frontend/src/services/holidayService.js`) is pure date arithmetic over data the frontend already has fully in hand once it's talking to this API: the holiday ranges from `GET /settings/holidays` and a group's `scheduleDays` from `GET /groups`. There's no student- or payment-specific server state involved, so there's nothing for the server to compute that the client can't already compute from those two responses — keep `countHolidayDays`/`countMissedLessons` client-side exactly as they are today, just point them at the new endpoints' data instead of the old Firebase subscriptions. If a real correctness gap shows up here it'd be a new decision (route it through `/architect`), not a missing wiring detail.
