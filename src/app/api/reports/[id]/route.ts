import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { getAssessment } from '@/lib/assessments/loader'

// GET /api/reports/[id] — view a report. Role-checked:
//   - Super Admin: any report
//   - Counsellor: only reports explicitly assigned to them
//   - Student: only if paymentStatus === PAID (future payment integration)
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return error('Authentication required', 401)
  const { id } = await params

  const report = await db.report.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true, phone: true } },
      assessment: { select: { id: true, title: true, slug: true, description: true, purpose: true, category: true } },
      attempt: { select: { id: true, startedAt: true, completedAt: true } },
      counsellorAccess: { select: { counsellorId: true } },
    },
  })
  if (!report) return error('Report not found', 404)
  // ScoreResult is linked via the attempt (attemptId is unique on both)
  const scoreResult = await db.scoreResult.findUnique({ where: { attemptId: report.attemptId } })

  // Authorisation
  if (user.role === 'SUPER_ADMIN') {
    // allowed
  } else if (user.role === 'COUNSELLOR') {
    const ok = report.counsellorAccess.some((c) => c.counsellorId === user.id)
    if (!ok) return error('You are not authorised to view this report', 403)
  } else if (user.role === 'STUDENT') {
    if (report.studentId !== user.id) return error('Not your report', 403)
    if (report.paymentStatus !== 'PAID') {
      return error('Report access requires payment authorisation. Please complete payment to unlock your report.', 402)
    }
  } else {
    return error('Forbidden', 403)
  }

  const dims = scoreResult ? JSON.parse(scoreResult.dimensions) : []
  const topDims = scoreResult?.topDimensions ? JSON.parse(scoreResult.topDimensions) : []

  // Enrich dimensions with strengths/development areas from the assessment definition
  const normAssessment = getAssessment(report.assessment.slug)
  const enrichedDims = normAssessment ? dims.map((d: any) => {
    const dimDef = normAssessment.dimensions.find((dd) => dd.code === d.code || dd.name === d.name)
    return {
      ...d,
      strengths: dimDef?.strengths || [],
      developmentAreas: dimDef?.developmentAreas || [],
      dimensionDescription: dimDef?.description || '',
    }
  }) : dims

  return json({
    report: {
      id: report.id, generatedAt: report.generatedAt, accessLevel: report.accessLevel,
      paymentStatus: report.paymentStatus,
      student: report.student, assessment: report.assessment, attempt: report.attempt,
      score: {
        dimensions: enrichedDims, totalScore: scoreResult?.totalScore ?? null,
        recommendation: scoreResult?.recommendation ?? null, topDimensions: topDims,
      },
    },
  })
})

export const dynamic = 'force-dynamic'
