import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'

// GET /api/admin/audit — recent audit log entries.
export const GET = apiHandler(async (req: NextRequest) => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { searchParams } = new URL(req.url)
  const limit = Math.min(200, Number(searchParams.get('limit') || 100))
  const logs = await db.auditLog.findMany({
    take: limit, orderBy: { createdAt: 'desc' },
    select: { id: true, action: true, actorId: true, actorRole: true, targetType: true, targetId: true, metadata: true, ip: true, createdAt: true },
  })
  return json({ logs })
})

export const dynamic = 'force-dynamic'
