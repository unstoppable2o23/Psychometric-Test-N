import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, hashPassword } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters') })

// POST /api/admin/users/[id]/reset-password
// Super Admin can reset the password of ANY user (student or counsellor).
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id } = await params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return error('User not found', 404)
  if (target.role === 'SUPER_ADMIN') return error('Cannot reset another admin\'s password from here', 403)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('Validation failed', 400, parsed.error.flatten().fieldErrors)

  await db.user.update({ where: { id }, data: { passwordHash: hashPassword(parsed.data.password) } })
  await audit('USER_PASSWORD_RESET_BY_ADMIN', { actor: admin, targetType: 'USER', targetId: id, metadata: { targetRole: target.role } })

  return json({ ok: true })
})

export const dynamic = 'force-dynamic'
