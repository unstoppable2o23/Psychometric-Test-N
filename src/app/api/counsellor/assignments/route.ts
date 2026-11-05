import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'

// GET /api/counsellor/assignments — all tests assigned BY this counsellor,
// with student name, test name, assignment date, and status. Only the
// counsellor's own assignments are returned (access isolation).
export const GET = apiHandler(async () => {
  const me = requireRole(await getCurrentUser(), 'COUNSELLOR')
  const assignments = await db.assignment.findMany({
    where: { assignedById: me.id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      assessment: { select: { id: true, title: true, slug: true, category: true, totalQuestions: true } },
      attempts: { select: { id: true, status: true, completedAt: true, currentQuestionIndex: true } },
      tokens: { select: { token: true, revokedAt: true, expiresAt: true }, where: { revokedAt: null }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Enrich with report + score info (ScoreResult is linked via attemptId)
  const attemptIds = assignments.flatMap((a) => a.attempts.map((at) => at.id))
  const [reports, scores] = await Promise.all([
    db.report.findMany({ where: { attemptId: { in: attemptIds } }, select: { id: true, attemptId: true } }),
    db.scoreResult.findMany({ where: { attemptId: { in: attemptIds } }, select: { attemptId: true, recommendation: true, totalScore: true } }),
  ])
  const reportByAttempt = Object.fromEntries(reports.map((r) => [r.attemptId, r]))
  const scoreByAttempt = Object.fromEntries(scores.map((s) => [s.attemptId, s]))

  const items = assignments.map((a) => {
    const attempt = a.attempts[0]
    const report = attempt ? reportByAttempt[attempt.id] : null
    const statusLabel = a.status === 'ASSIGNED' ? 'Pending' : a.status === 'IN_PROGRESS' ? 'In Progress' : 'Completed'
    const activeToken = a.tokens[0]?.token
    return {
      id: a.id,
      studentName: a.student.name,
      studentEmail: a.student.email,
      testTitle: a.assessment.title,
      testCategory: a.assessment.category,
      assignedAt: a.createdAt,
      completedAt: a.completedAt,
      status: statusLabel,
      rawStatus: a.status,
      progress: attempt ? `${attempt.currentQuestionIndex} / ${a.assessment.totalQuestions || 0}` : null,
      testUrl: activeToken ? `/?test=${activeToken}` : null,
      reportId: report?.id ?? null,
      recommendation: attempt ? (scoreByAttempt[attempt.id]?.recommendation ?? null) : null,
    }
  })

  return json({ assignments: items })
})

export const dynamic = 'force-dynamic'
