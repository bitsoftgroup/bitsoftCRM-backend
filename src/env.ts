import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  PORT: Number(process.env.PORT || 4000),
  PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'http://localhost:4000',
  DESKTOP_API_BASE_URL: process.env.DESKTOP_API_BASE_URL || 'http://localhost:4000/api/v1',
  // sha256 hash of the one tenant token that can address any education center's data.
  MASTER_TOKEN_HASH: process.env.MASTER_TOKEN_HASH || null,
}
