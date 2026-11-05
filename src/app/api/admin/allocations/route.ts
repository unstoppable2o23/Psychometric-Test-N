import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

// GET /api/admin/allocations — all counsellor allocations with usage stats.
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const allocations = await db.counsellorAllocation.findMany({
    include: {
      counsellor: { select: { id: true, name: true, email: true } },
      assessment: { select: { id: true, title: true, slug: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return json({ allocations })
})

const schema = z.object({
  counsellorId: z.string(),
  assessmentId: z.string(),
  quantity: z.number().int().min(0),
})

// POST /api/admin/allocations — allocate (or top up) test credits for a counsellor.
// If an allocation already exists for this counsellor+assessment, the quantity
// is REPLACED (not added) so the admin controls the exact total.
export const POST = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('Validation failed', 400, parsed.error.flatten().fieldErrors)
  const { counsellorId, assessmentId, quantity } = parsed.data

  const counsellor = await db.user.findUnique({ where: { id: counsellorId } })
  if (!counsellor || counsellor.role !== 'COUNSELLOR') return error('Counsellor not found', 404)
  const assessment = await db.assessment.findUnique({ where: { id: assessmentId } })
  if (!assessment) return error('Assessment not found', 404)

  const existing = await db.counsellorAllocation.findUnique({
    where: { counsellorId_assessmentId: { counsellorId, assessmentId } },
  })
  // Prevent reducing below already-used credits
  if (existing && quantity < existing.used) {
    return error(`Cannot set quantity below ${existing.used} (already used credits)`, 400)
  }

  const alloc = existing
    ? await db.counsellorAllocation.update({ where: { id: existing.id }, data: { quantity } })
    : await db.counsellorAllocation.create({ data: { counsellorId, assessmentId, quantity } })

  await audit('ALLOCATION_SET', { actor: admin, targetType: 'COUNSELLOR_ALLOCATION', targetId: alloc.id, metadata: { counsellorId, assessmentId, quantity, used: alloc.used } })
  return json({ allocation: alloc })
})

export const dynamic = 'force-dynamic'
