import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'

// GET /api/counsellor/manuals — list of interpretation manuals (metadata only).
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'COUNSELLOR')
  const manuals = await db.interpretationManual.findMany({
    include: { assessment: { select: { id: true, title: true, slug: true, category: true, purpose: true, targetPopulation: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return json({ manuals: manuals.map((m) => ({ id: m.id, assessmentId: m.assessmentId, title: m.title, assessment: m.assessment })) })
})

export const dynamic = 'force-dynamic'
