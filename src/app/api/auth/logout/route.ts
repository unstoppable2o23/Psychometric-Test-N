import { NextRequest } from 'next/server'
import { destroySession, getCurrentUser } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'
import { audit } from '@/lib/audit'

export const POST = apiHandler(async (_req: NextRequest) => {
  const user = await getCurrentUser()
  await destroySession()
  if (user) await audit('LOGOUT', { actor: user, targetType: 'USER', targetId: user.id })
  return json({ ok: true })
})
