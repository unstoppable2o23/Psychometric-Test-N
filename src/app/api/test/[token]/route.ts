import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiHandler, json } from '@/lib/api'
import { validateTestToken, getNormAssessment, publicQuestion } from '@/lib/test-engine'
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const ctx = await validateTestToken(token)
  const assessment = getNormAssessment(ctx.assessmentSlug)
  const questions = assessment.questions
  const idx = Math.min(ctx.currentQuestionIndex, questions.length - 1)
  const q = questions[idx]
  const dbQ = await db.question.findFirst({ where: { assessmentId: ctx.assessmentId, orderIndex: q.orderIndex } })
  const existing = dbQ ? await db.answer.findUnique({ where: { attemptId_questionId: { attemptId: ctx.attemptId, questionId: dbQ.id } } }).catch(() => null) : null
  return json({ assessment: { slug: assessment.slug, title: assessment.title, shortTitle: assessment.shortTitle, instructions: assessment.instructions, totalQuestions: questions.length, estimatedMinutes: assessment.estimatedMinutes, category: assessment.category }, question: publicQuestion(q, idx, questions.length), answeredCount: idx, canGoBack: idx > 0, existingAnswer: existing?.selectedOption ?? null, status: ctx.status })
})
export const dynamic = 'force-dynamic'
