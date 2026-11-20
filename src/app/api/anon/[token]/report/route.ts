import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiHandler, json, error } from '@/lib/api'
import { getAssessment } from '@/lib/assessments/loader'
import { scoreAttempt } from '@/lib/scoring'

// GET /api/anon/[token]/report — get the completed report for the student
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const link = await db.anonymousTestLink.findUnique({
    where: { token },
    include: { assessment: true, student: { select: { id: true, name: true, email: true } } },
  })
  if (!link) return error('Invalid test link', 404)
  if (link.status !== 'REPORT_GENERATED' && link.status !== 'COMPLETED') return error('Report not available yet', 400)
  if (!link.reportId) return error('Report not found', 404)

  const report = await db.report.findUnique({
    where: { id: link.reportId },
    include: { attempt: { select: { id: true, completedAt: true, scoreResult: true } } },
  })
  if (!report) return error('Report not found', 404)

  // Enrich with assessment definition data
  const normAssessment = getAssessment(link.assessment.slug)
  const scoreResult = report.attempt.scoreResult
  const dims = scoreResult ? JSON.parse(scoreResult.dimensions) : []
  const enrichedDims = normAssessment ? dims.map((d: any) => {
    const dimDef = normAssessment.dimensions.find((dd) => dd.code === d.code || dd.name === d.name)
    return { ...d, strengths: dimDef?.strengths || [], developmentAreas: dimDef?.developmentAreas || [], dimensionDescription: dimDef?.description || '' }
  }) : dims

  return json({
    report: {
      id: report.id,
      generatedAt: report.generatedAt,
      student: link.student,
      assessment: { title: link.assessment.title, slug: link.assessment.slug, purpose: link.assessment.purpose, category: link.assessment.category, description: link.assessment.description },
      attempt: report.attempt,
      score: {
        dimensions: enrichedDims,
        totalScore: scoreResult?.totalScore ?? null,
        recommendation: scoreResult?.recommendation ?? null,
        topDimensions: scoreResult?.topDimensions ? JSON.parse(scoreResult.topDimensions) : [],
      },
    },
  })
})
export const dynamic = 'force-dynamic'
