import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'

// GET /api/admin/reports — all generated reports.
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const reports = await db.report.findMany({
    include: {
      student: { select: { id: true, name: true, email: true } },
      assessment: { select: { id: true, title: true, slug: true } },
      attempt: { select: { id: true, completedAt: true } },
      counsellorAccess: { include: { counsellor: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { generatedAt: 'desc' },
  })
  // Fetch score results for each report's attempt (linked via attemptId)
  const attemptIds = reports.map((r) => r.attemptId)
  const scores = await db.scoreResult.findMany({ where: { attemptId: { in: attemptIds } } })
  const scoreByAttempt = Object.fromEntries(scores.map((s) => [s.attemptId, s]))
  const enriched = reports.map((r) => ({
    ...r, scoreResult: scoreByAttempt[r.attemptId] ?? null,
  }))
  return json({ reports: enriched })
})

export const dynamic = 'force-dynamic'
