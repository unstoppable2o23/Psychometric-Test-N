import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiHandler, json, error } from '@/lib/api'
import { getAssessment } from '@/lib/assessments/loader'
import { scoreAttempt } from '@/lib/scoring'
import { audit } from '@/lib/audit'

// POST /api/anon/[token]/submit — submit answers, score server-side, generate report
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const link = await db.anonymousTestLink.findUnique({
    where: { token },
    include: { assessment: true, student: true },
  })
  if (!link) return error('Invalid test link', 404)
  if (link.status === 'DISABLED') return error('Link disabled', 410)
  if (!link.studentId || !link.assignmentId) return error('Please register first', 400)
  if (link.status === 'COMPLETED' || link.status === 'REPORT_GENERATED') return error('Test already completed', 409)

  const body = await req.json().catch(() => null)
  const { answers } = body || {}
  if (!answers) return error('Answers are required', 400)

  const normAssessment = getAssessment(link.assessment.slug)
  if (!normAssessment) return error('Assessment definition missing', 500)

  // Find the attempt
  const attempt = await db.attempt.findFirst({
    where: { assignmentId: link.assignmentId, status: 'IN_PROGRESS' },
  })
  if (!attempt) return error('No active attempt found', 400)

  // Store & validate answers server-side
  for (const [orderStr, selectedOption] of Object.entries(answers)) {
    const orderIndex = parseInt(orderStr, 10)
    const q = normAssessment.questions[orderIndex]
    if (!q || !q.options.includes(selectedOption as string)) continue
    const dbQ = await db.question.findFirst({ where: { assessmentId: link.assessmentId, orderIndex } })
    if (dbQ) {
      await db.answer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: dbQ.id } },
        create: { attemptId: attempt.id, questionId: dbQ.id, questionOrder: orderIndex, selectedOption: selectedOption as string },
        update: { selectedOption: selectedOption as string },
      })
    }
  }

  // Score entirely on server
  const dbAnswers = await db.answer.findMany({ where: { attemptId: attempt.id } })
  const answerMap: Record<number, string> = {}
  for (const a of dbAnswers) answerMap[a.questionOrder] = a.selectedOption
  const result = scoreAttempt(normAssessment, answerMap)

  // Store score + generate report
  await db.scoreResult.create({
    data: { attemptId: attempt.id, dimensions: JSON.stringify(result.dimensions), totalScore: result.totalScore ?? null, recommendation: result.recommendation ?? null, topDimensions: JSON.stringify(result.topDimensions ?? []) },
  })
  const report = await db.report.create({
    data: { attemptId: attempt.id, studentId: link.studentId, assessmentId: link.assessmentId, accessLevel: 'STUDENT', paymentRequired: false, paymentStatus: 'PAID' },
  })

  // Close attempt + assignment
  await db.attempt.update({ where: { id: attempt.id }, data: { status: 'COMPLETED', completedAt: new Date() } })
  await db.assignment.update({ where: { id: link.assignmentId }, data: { status: 'COMPLETED', completedAt: new Date() } })

  // Update link status
  await db.anonymousTestLink.update({ where: { token }, data: { status: 'REPORT_GENERATED', reportId: report.id } })

  await audit('ANON_TEST_COMPLETED', { actor: { id: link.studentId, role: 'STUDENT' }, targetType: 'ANON_LINK', targetId: link.id, metadata: { reportId: report.id } })

  return json({ ok: true, reportId: report.id, recommendation: result.recommendation, dimensions: result.dimensions.map((d) => ({ name: d.name, pct: d.pct, level: d.level, score: d.score, maxScore: d.maxScore })) })
})
export const dynamic = 'force-dynamic'
