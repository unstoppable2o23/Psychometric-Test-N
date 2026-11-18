import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// POST /api/admin/test-links/[id]/deactivate — revoke a direct test link
export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id } = await params
  const token = await db.accessToken.findUnique({ where: { id } })
  if (!token) return error('Test link not found', 404)
  if (token.revokedAt) return error('Link already deactivated', 400)

  await db.accessToken.update({ where: { id }, data: { revokedAt: new Date() } })
  await audit('DIRECT_TEST_LINK_DEACTIVATED', { actor: admin, targetType: 'ACCESS_TOKEN', targetId: id })

  return json({ ok: true })
})

export const dynamic = 'force-dynamic'
