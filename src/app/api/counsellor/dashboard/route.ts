import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'

// GET /api/counsellor/dashboard — assigned students + accessible reports + manuals list.
export const GET = apiHandler(async () => {
  const me = requireRole(await getCurrentUser(), 'COUNSELLOR')
  const [students, reports, manuals] = await Promise.all([
    db.counsellorStudent.findMany({
      where: { counsellorId: me.id },
      include: { student: { select: { id: true, name: true, email: true, phone: true } } },
    }),
    db.counsellorReportAccess.findMany({
      where: { counsellorId: me.id },
      include: {
        report: {
          include: {
            student: { select: { id: true, name: true, email: true } },
            assessment: { select: { id: true, title: true, slug: true, category: true } },
            attempt: { select: { id: true, completedAt: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.interpretationManual.findMany({
      include: { assessment: { select: { id: true, title: true, slug: true, category: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ])
  // Fetch score results for the reports' attempts
  const attemptIds = reports.map((r) => r.report.attemptId)
  const scores = await db.scoreResult.findMany({ where: { attemptId: { in: attemptIds } }, select: { attemptId: true, recommendation: true, totalScore: true } })
  const scoreByAttempt = Object.fromEntries(scores.map((s) => [s.attemptId, s]))
  return json({
    counsellor: { id: me.id, name: me.name, email: me.email },
    students: students.map((s) => s.student),
    reports: reports.map((r) => ({ id: r.report.id, grantedAt: r.createdAt, ...r.report, scoreResult: scoreByAttempt[r.report.attemptId] ?? null })),
    manuals: manuals.map((m) => ({ id: m.id, assessmentId: m.assessment.id, title: m.title, assessment: m.assessment })),
  })
})

export const dynamic = 'force-dynamic'
