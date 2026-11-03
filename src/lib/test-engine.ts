import { db } from '@/lib/db'
import { getAssessment, NormAssessment, NormQuestion } from '@/lib/assessments/loader'
import { AuthError } from '@/lib/auth'

export interface ValidTokenContext {
  token: string
  assignmentId: string
  attemptId: string
  studentId: string
  assessmentId: string
  assessmentSlug: string
  currentQuestionIndex: number
  status: string
}

// Validate a secure test token. Throws AuthError on any failure.
export async function validateTestToken(token: string): Promise<ValidTokenContext> {
  if (!token || !/^[0-9a-f]+$/.test(token)) throw new AuthError('Invalid token', 400)
  const access = await db.accessToken.findUnique({
    where: { token },
    include: { assignment: { include: { assessment: true, attempts: true } } },
  })
  if (!access) throw new AuthError('Test link not found', 404)
  if (access.revokedAt) throw new AuthError('This test link has been revoked. Please start the test again from your dashboard.', 410)
  if (access.expiresAt < new Date()) throw new AuthError('This test link has expired. Please start the test again from your dashboard.', 410)
  if (access.assignment.status === 'COMPLETED') throw new AuthError('This assessment has already been completed.', 410)

  const attempt = access.assignment.attempts.find((a) => a.status === 'IN_PROGRESS')
  if (!attempt) throw new AuthError('No active attempt found. Please start the test again.', 410)

  return {
    token, assignmentId: access.assignmentId, attemptId: attempt.id,
    studentId: attempt.studentId, assessmentId: attempt.assessmentId,
    assessmentSlug: access.assignment.assessment.slug,
    currentQuestionIndex: attempt.currentQuestionIndex, status: attempt.status,
  }
}

// Return only the safe (non-confidential) question fields for the browser.
export function publicQuestion(q: NormQuestion, index: number, total: number) {
  return {
    orderIndex: q.orderIndex,
    number: index + 1,
    total,
    sectionName: q.sectionName,
    text: q.text,
    questionType: q.questionType,
    options: q.options,
  }
}

export function getNormAssessment(slug: string): NormAssessment {
  const a = getAssessment(slug)
  if (!a) throw new AuthError('Assessment not found', 404)
  return a
}
