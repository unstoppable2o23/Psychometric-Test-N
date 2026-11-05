import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'

// GET /api/counsellor/allocations — the logged-in counsellor's test credit pool.
export const GET = apiHandler(async () => {
  const me = requireRole(await getCurrentUser(), 'COUNSELLOR')
  const allocations = await db.counsellorAllocation.findMany({
    where: { counsellorId: me.id },
    include: { assessment: { select: { id: true, title: true, slug: true, category: true, totalQuestions: true, estimatedMinutes: true, description: true } } },
    orderBy: { createdAt: 'desc' },
  })
  const totalAllocated = allocations.reduce((s, a) => s + a.quantity, 0)
  const totalUsed = allocations.reduce((s, a) => s + a.used, 0)
  return json({
    allocations: allocations.map((a) => ({ ...a, available: Math.max(0, a.quantity - a.used) })),
    totalAllocated,
    totalUsed,
    totalAvailable: Math.max(0, totalAllocated - totalUsed),
  })
})

export const dynamic = 'force-dynamic'
