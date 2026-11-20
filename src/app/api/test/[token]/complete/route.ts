import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiHandler, json, error } from '@/lib/api'
import { validateTestToken, getNormAssessment } from '@/lib/test-engine'
import { scoreAttempt } from '@/lib/scoring'
import { audit } from '@/lib/audit'
export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const ctx = await validateTestToken(token)
  const assessment = getNormAssessment(ctx.assessmentSlug)
  const questions = assessment.questions
  const dbAnswers = await db.answer.findMany({ where: { attemptId: ctx.attemptId } })
  const answerMap: Record<number, string> = {}
  for (const a of dbAnswers) answerMap[a.questionOrder] = a.selectedOption
  const missing = questions.filter((q) => answerMap[q.orderIndex] === undefined)
  if (missing.length > 0) return error(`Please answer all questions. ${missing.length} unanswered.`, 400)
  for (const q of questions) { if (!q.options.includes(answerMap[q.orderIndex])) return error('One or more answers are invalid.', 400) }
  const result = scoreAttempt(assessment, answerMap)
  await db.scoreResult.create({ data: { attemptId: ctx.attemptId, dimensions: JSON.stringify(result.dimensions), totalScore: result.totalScore ?? null, recommendation: result.recommendation ?? null, topDimensions: JSON.stringify(result.topDimensions ?? []) } })
  const report = await db.report.create({ data: { attemptId: ctx.attemptId, studentId: ctx.studentId, assessmentId: ctx.assessmentId, accessLevel: 'ADMIN_COUNSELLOR', paymentRequired: true, paymentStatus: 'NOT_REQUIRED' } })
  await db.attempt.update({ where: { id: ctx.attemptId }, data: { status: 'COMPLETED', completedAt: new Date() } })
  await db.assignment.update({ where: { id: ctx.assignmentId }, data: { status: 'COMPLETED', completedAt: new Date() } })
  await db.accessToken.update({ where: { token }, data: { revokedAt: new Date(), usedAt: new Date() } })

  // Anonymous-link flow: when the attempt belongs to an anonymous test link,
  // mark the link completed so the student's report page (anon/[token]) can
  // load it, and make the report immediately accessible (mirrors the legacy
  // /api/anon/[token]/submit path which creates STUDENT/PAID reports).
  const anonLink = await db.anonymousTestLink.findFirst({ where: { assignmentId: ctx.assignmentId } })
  if (anonLink && anonLink.status !== 'DISABLED' && anonLink.status !== 'REPORT_GENERATED') {
    await db.report.update({ where: { id: report.id }, data: { accessLevel: 'STUDENT', paymentRequired: false, paymentStatus: 'PAID' } })
    await db.anonymousTestLink.update({ where: { id: anonLink.id }, data: { status: 'REPORT_GENERATED', reportId: report.id } })
  }

  await audit('TEST_COMPLETED', { actor: { id: ctx.studentId, role: 'STUDENT' }, targetType: 'ATTEMPT', targetId: ctx.attemptId, metadata: { reportId: report.id } })
  return json({ ok: true, reportId: report.id, recommendation: result.recommendation, topDimensions: result.topDimensions, celebration: true })
})
export const dynamic = 'force-dynamic'
