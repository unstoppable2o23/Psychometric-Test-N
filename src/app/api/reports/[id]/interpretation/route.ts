import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { getAssessment } from '@/lib/assessments/loader'
import { scoreAttempt } from '@/lib/scoring'
import { generateUniversalSmartInterpretation, extractInterpretationData, getTestType } from '@/lib/smart-interpreter'

// GET /api/reports/[id]/interpretation
// Counsellors and Super Admins only. Returns the Smart Interpreter HTML narrative.
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return error('Authentication required', 401)
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'COUNSELLOR') {
    return error('Only counsellors and super admins may view interpretations', 403)
  }

  const { id } = await params
  const report = await db.report.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      assessment: { select: { id: true, title: true, slug: true } },
      attempt: { select: { id: true } },
      counsellorAccess: { select: { counsellorId: true } },
    },
  })
  if (!report) return error('Report not found', 404)

  // Authorization: counsellors can only view reports assigned to them
  if (user.role === 'COUNSELLOR') {
    const ok = report.counsellorAccess.some((c) => c.counsellorId === user.id)
    if (!ok) return error('You are not authorised to view this report', 403)
  }

  // Recompute the full score (includes domainBreakdown for stream-selector)
  const normAssessment = getAssessment(report.assessment.slug)
  if (!normAssessment) return error('Assessment definition missing', 500)

  const answers = await db.answer.findMany({ where: { attemptId: report.attempt.id } })
  const answerMap: Record<number, string> = {}
  for (const a of answers) answerMap[a.questionOrder] = a.selectedOption
  const result = scoreAttempt(normAssessment, answerMap)

  // Extract the data object for the interpreter
  const data = extractInterpretationData(
    report.assessment.slug,
    result.dimensions,
    result.domainBreakdown,
    result.recommendation || undefined,
  )

  // Generate the interpretation HTML
  const testType = getTestType(report.assessment.slug)
  const html = generateUniversalSmartInterpretation(testType, report.student.name, data)

  return json({
    interpretation: html,
    testType,
    studentName: report.student.name,
    assessmentTitle: report.assessment.title,
    data,
  })
})

export const dynamic = 'force-dynamic'
