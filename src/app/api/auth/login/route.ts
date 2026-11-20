import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createSession, setSessionCookie, verifyPassword, AuthError } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

export const POST = apiHandler(async (req: NextRequest) => {
  const { email, password } = await req.json().catch(() => ({}))
  if (!email || !password) return error('Email and password are required', 400)
  const user = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
  if (!user || !user.passwordHash) return error('Invalid credentials', 401)
  if (!user.isActive) return error('Your account has been deactivated. Contact the administrator.', 403)
  if (!verifyPassword(String(password), user.passwordHash)) {
    return error('Invalid credentials', 401)
  }
  // NOTE: The selected portal tab is a UI hint only — routing is driven by the
  // user's actual role (see defaultViewFor in store.ts). We deliberately do NOT
  // reject a valid login just because the tab doesn't match; every downstream
  // admin/counsellor API still enforces requireRole() server-side, so security
  // is preserved without the friction of a portal-mismatch error.
  const token = await createSession(user.id)
  await setSessionCookie(token)
  await audit('LOGIN', { actor: { id: user.id, role: user.role }, targetType: 'USER', targetId: user.id })
  const { passwordHash, ...safe } = user
  return json({ user: safe })
})

export const dynamic = 'force-dynamic'
