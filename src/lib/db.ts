import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Turso (libSQL) connection resolution
// ---------------------------------------------------------------------------
// Accepts both the Turso Vercel-integration default names
// (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN) and the generic names
// (DATABASE_URL / DATABASE_AUTH_TOKEN). process.env wins (Vercel env vars),
// then .env (local dev) — Next.js's @next/env loader does NOT override
// existing process.env, so we read .env directly to beat any stale
// shell-inherited file:// SQLite URL in this sandbox.
function readEnvFile(): Record<string, string> {
  try {
    const envPath = path.join(process.cwd(), '.env')
    const out: Record<string, string> = {}
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.+?)"?\s*$/)
      if (m) out[m[1]] = m[2]
    }
    return out
  } catch {
    return {}
  }
}

const envFile = readEnvFile()

function pick(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k] ?? envFile[k]
    if (v) return v
  }
  return undefined
}

// Resolve URL (prefer libsql://, accept file:// as local fallback) and token.
const tursoUrl =
  pick('TURSO_DATABASE_URL', 'DATABASE_URL') ??
  (process.env.DATABASE_URL?.startsWith('file:') ? process.env.DATABASE_URL : 'file:./db/custom.db')
const tursoToken = pick('TURSO_AUTH_TOKEN', 'DATABASE_AUTH_TOKEN')

// Promote resolved values to process.env so Prisma's datasource env() sees them.
if (tursoUrl) process.env.DATABASE_URL = tursoUrl
if (tursoToken) process.env.DATABASE_AUTH_TOKEN = tursoToken

const libsqlConfig = { url: tursoUrl, authToken: tursoToken }
const adapter = new PrismaLibSql(libsqlConfig)

// ---------------------------------------------------------------------------
// Prisma client singleton (survives Next.js dev hot-reload)
// ---------------------------------------------------------------------------
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
