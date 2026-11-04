import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, verifyPassword, hashPassword } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

// POST /api/auth/change-password — the authenticated user changes their own
// password. Requires the current password for verification.
export const POST = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return error('Authentication required', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('Validation failed', 400, parsed.error.flatten().fieldErrors)

  const { currentPassword, newPassword } = parsed.data
  const full = await db.user.findUnique({ where: { id: user.id } })
  if (!full?.passwordHash) return error('No password set on this account', 400)
  if (!verifyPassword(currentPassword, full.passwordHash)) {
    return error('Current password is incorrect', 403)
  }

  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(newPassword) } })
  await audit('PASSWORD_CHANGED', { actor: user, targetType: 'USER', targetId: user.id })
  return json({ ok: true })
})

export const dynamic = 'force-dynamic'
