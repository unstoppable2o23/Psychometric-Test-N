import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// DATABASE_URL resolution
// ---------------------------------------------------------------------------
// Next.js's @next/env loader does NOT override variables already present in
// process.env. In this sandbox the shell exports a SQLite DATABASE_URL at
// session start, which would silently shadow the real connection string in
// .env and point the app at a stale local file. To make .env the single
// source of truth, we read it directly and patch process.env before the
// PrismaClient is constructed (Prisma reads env("DATABASE_URL") at init).
function resolveDatabaseUrl(): string | undefined {
  // Prefer an already-set PostgreSQL URL (e.g. Vercel env var or inline export).
  const shell = process.env.DATABASE_URL
  if (shell && shell.startsWith('postgres')) return shell
  // Otherwise load from .env (gitignored, contains the real Neon URL).
  try {
    const envPath = path.join(process.cwd(), '.env')
    const content = fs.readFileSync(envPath, 'utf8')
    const match = content.match(/^DATABASE_URL=(.+)$/m)
    if (match) {
      const url = match[1].trim()
      if (url.startsWith('postgres')) return url
    }
  } catch {
    // .env missing — fall through to whatever is set.
  }
  return shell
}

const resolvedUrl = resolveDatabaseUrl()
if (resolvedUrl && process.env.DATABASE_URL !== resolvedUrl) {
  process.env.DATABASE_URL = resolvedUrl
}

// ---------------------------------------------------------------------------
// Prisma client singleton (survives Next.js dev hot-reload)
// ---------------------------------------------------------------------------
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
