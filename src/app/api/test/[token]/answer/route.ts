import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiHandler, json, error } from '@/lib/api'
import { validateTestToken, getNormAssessment, publicQuestion } from '@/lib/test-engine'
import { audit } from '@/lib/audit'
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const ctx = await validateTestToken(token)
  const body = await req.json().catch(() => ({}))
  const { selectedOption } = body
  if (typeof selectedOption !== 'string') return error('A valid option selection is required', 400)
  const assessment = getNormAssessment(ctx.assessmentSlug)
  const questions = assessment.questions
  const idx = Math.min(ctx.currentQuestionIndex, questions.length - 1)
  const q = questions[idx]
  if (!q.options.includes(selectedOption)) return error('Invalid option for this question', 400)
  const dbQ = await db.question.findFirst({ where: { assessmentId: ctx.assessmentId, orderIndex: q.orderIndex } })
  if (!dbQ) return error('Question record missing', 500)
  await db.answer.upsert({ where: { attemptId_questionId: { attemptId: ctx.attemptId, questionId: dbQ.id } }, create: { attemptId: ctx.attemptId, questionId: dbQ.id, questionOrder: q.orderIndex, selectedOption }, update: { selectedOption } })
  const nextIdx = idx + 1
  if (nextIdx >= questions.length) { await db.accessToken.update({ where: { token }, data: { usedAt: new Date() } }); await audit('TEST_LAST_QUESTION_ANSWERED', { actor: { id: ctx.studentId, role: 'STUDENT' }, targetType: 'ATTEMPT', targetId: ctx.attemptId }); return json({ complete: true, answeredAll: true }) }
  await db.attempt.update({ where: { id: ctx.attemptId }, data: { currentQuestionIndex: nextIdx } })
  return json({ complete: false, question: publicQuestion(questions[nextIdx], nextIdx, questions.length), answeredCount: nextIdx, canGoBack: true })
})
export const dynamic = 'force-dynamic'
