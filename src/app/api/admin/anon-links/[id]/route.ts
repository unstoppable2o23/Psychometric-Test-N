import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// POST /api/admin/anon-links/[id]/disable
export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id } = await params
  const link = await db.anonymousTestLink.findUnique({ where: { id } })
  if (!link) return error('Link not found', 404)
  await db.anonymousTestLink.update({ where: { id }, data: { status: 'DISABLED' } })
  await audit('ANON_LINK_DISABLED', { actor: admin, targetType: 'ANON_LINK', targetId: id })
  return json({ ok: true })
})
export const dynamic = 'force-dynamic'
