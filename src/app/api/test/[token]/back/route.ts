import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiHandler, json } from '@/lib/api'
import { validateTestToken, getNormAssessment, publicQuestion } from '@/lib/test-engine'
export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const ctx = await validateTestToken(token)
  const assessment = getNormAssessment(ctx.assessmentSlug)
  const idx = Math.max(0, ctx.currentQuestionIndex - 1)
  await db.attempt.update({ where: { id: ctx.attemptId }, data: { currentQuestionIndex: idx } })
  const q = assessment.questions[idx]
  const dbQ = await db.question.findFirst({ where: { assessmentId: ctx.assessmentId, orderIndex: q.orderIndex } })
  const existing = dbQ ? await db.answer.findUnique({ where: { attemptId_questionId: { attemptId: ctx.attemptId, questionId: dbQ.id } } }).catch(() => null) : null
  return json({ question: publicQuestion(q, idx, assessment.questions.length), answeredCount: idx, canGoBack: idx > 0, existingAnswer: existing?.selectedOption ?? null })
})
export const dynamic = 'force-dynamic'
