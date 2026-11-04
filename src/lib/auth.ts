import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { User } from '@prisma/client'

// ---------------------------------------------------------------------------
// Password hashing (scrypt — Node built-in, no native deps)
// ---------------------------------------------------------------------------
const SCRYPT_KEYLEN = 64
const SCRYPT_PARAMS = { N: 16384, r: 16, p: 1, maxmem: 64 * 1024 * 1024 }

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const salt = Buffer.from(parts[1], 'hex')
  const expected = Buffer.from(parts[2], 'hex')
  const hash = crypto.scryptSync(password, salt, expected.length, SCRYPT_PARAMS)
  return crypto.timingSafeEqual(hash, expected)
}

// ---------------------------------------------------------------------------
// Secure session token generation
// ---------------------------------------------------------------------------
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

const SESSION_COOKIE = 'ppt_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({ data: { userId, token, expiresAt } })
  return token
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value
}

// ---------------------------------------------------------------------------
// Get the authenticated user (or null) from the current request
// ---------------------------------------------------------------------------
export type AuthUser = Omit<User, 'passwordHash'>

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken()
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (!session.user.isActive) return null
  const { passwordHash, ...safe } = session.user
  return safe
}

export async function destroySession(): Promise<void> {
  const token = await getSessionToken()
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {})
  }
  await clearSessionCookie()
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------
export type Role = 'STUDENT' | 'SUPER_ADMIN' | 'COUNSELLOR'

export function requireRole(user: AuthUser | null, ...roles: Role[]): AuthUser {
  if (!user) throw new AuthError('Authentication required', 401)
  if (!roles.includes(user.role as Role)) {
    throw new AuthError('Insufficient permissions', 403)
  }
  return user
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Secure random token generator for test access links
// ---------------------------------------------------------------------------
export function generateSecureToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex')
}
