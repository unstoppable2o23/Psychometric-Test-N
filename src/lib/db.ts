import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Turso (libSQL) connection resolution
// ---------------------------------------------------------------------------
// Next.js's @next/env loader does NOT override variables already present in
// process.env. In this sandbox the shell exports a local file:// SQLite URL at
// session start, which would shadow the real Turso URL in .env. To make .env
// the source of truth for Turso credentials, we read it directly and promote
// its libsql:// URL + token to process.env before constructing the client.
function readEnvFile(): Record<string, string> {
  try {
    const envPath = path.join(process.cwd(), '.env')
    const out: Record<string, string> = {}
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/)
      if (m) out[m[1]] = m[2]
    }
    return out
  } catch {
    return {}
  }
}

const envFile = readEnvFile()
// Promote Turso credentials from .env over any stale shell defaults.
if (envFile.DATABASE_URL?.startsWith('libsql')) process.env.DATABASE_URL = envFile.DATABASE_URL
if (envFile.DATABASE_AUTH_TOKEN) process.env.DATABASE_AUTH_TOKEN = envFile.DATABASE_AUTH_TOKEN

// Resolve the final connection URL + token.
//   1. A libsql:// URL (Turso cloud) — from process.env or .env
//   2. Otherwise fall back to the local SQLite file (sandbox / offline dev)
const tursoUrl =
  process.env.DATABASE_URL?.startsWith('libsql')
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL?.startsWith('file:')
      ? process.env.DATABASE_URL
      : 'file:./db/custom.db'
const tursoToken = process.env.DATABASE_AUTH_TOKEN

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
