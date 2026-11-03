import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createSession, setSessionCookie, verifyPassword, AuthError } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

export const POST = apiHandler(async (req: NextRequest) => {
  const { email, password, role } = await req.json().catch(() => ({}))
  if (!email || !password) return error('Email and password are required', 400)
  const user = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
  if (!user || !user.passwordHash) return error('Invalid credentials', 401)
  if (!user.isActive) return error('Your account has been deactivated. Contact the administrator.', 403)
  if (!verifyPassword(String(password), user.passwordHash)) {
    return error('Invalid credentials', 401)
  }
  if (role && user.role !== role) {
    return error(`This account is not authorised for the ${role} portal`, 403)
  }
  const token = await createSession(user.id)
  await setSessionCookie(token)
  await audit('LOGIN', { actor: { id: user.id, role: user.role }, targetType: 'USER', targetId: user.id })
  const { passwordHash, ...safe } = user
  return json({ user: safe })
})

export const dynamic = 'force-dynamic'
