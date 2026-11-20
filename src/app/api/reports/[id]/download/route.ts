import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { getAssessment } from '@/lib/assessments/loader'
import { scoreAttempt } from '@/lib/scoring'
import { generateReportPdfFile } from '@/lib/pdf'
import { generateUniversalSmartInterpretation, extractInterpretationData, getTestType } from '@/lib/smart-interpreter'

// GET /api/reports/[id]/download — role-checked PDF download (A4, vector).
export const GET = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return error('Authentication required', 401)
  const { id } = await params

  const report = await db.report.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, email: true, phone: true } },
      assessment: { select: { id: true, title: true, slug: true, purpose: true, category: true } },
      attempt: { select: { id: true, startedAt: true, completedAt: true } },
      counsellorAccess: { select: { counsellorId: true } },
    },
  })
  if (!report) return error('Report not found', 404)

  // Authorisation
  if (user.role === 'SUPER_ADMIN') {
    // allowed
  } else if (user.role === 'COUNSELLOR') {
    const ok = report.counsellorAccess.some((c) => c.counsellorId === user.id)
    if (!ok) return error('You are not authorised to download this report', 403)
  } else if (user.role === 'STUDENT') {
    if (report.studentId !== user.id) return error('Not your report', 403)
    if (report.paymentStatus !== 'PAID') return error('Payment authorisation required to download this report', 402)
  } else {
    return error('Forbidden', 403)
  }

  // Recompute the full score (includes domainBreakdown for stream-selector)
  const normAssessment = getAssessment(report.assessment.slug)
  if (!normAssessment) return error('Assessment definition missing', 500)
  const answers = await db.answer.findMany({ where: { attemptId: report.attempt.id } })
  const answerMap: Record<number, string> = {}
  for (const a of answers) answerMap[a.questionOrder] = a.selectedOption
  const result = scoreAttempt(normAssessment, answerMap)

  const pdfData = {
    platform: 'Psychometric Testing Platform',
    reportId: report.id,
    student: report.student,
    assessment: {
      ...report.assessment,
      purpose: normAssessment.purpose,
      targetPopulation: normAssessment.targetPopulation,
      description: normAssessment.description,
      instructions: normAssessment.instructions,
    },
    attempt: {
      id: report.attempt.id,
      startedAt: report.attempt.startedAt.toISOString(),
      completedAt: report.attempt.completedAt?.toISOString(),
    },
    score: {
      ...result,
      dimensions: result.dimensions.map((d) => {
        const dimDef = normAssessment.dimensions.find((dd) => dd.code === d.code || dd.name === d.name)
        return {
          ...d,
          strengths: dimDef?.strengths || [],
          developmentAreas: dimDef?.developmentAreas || [],
          dimensionDescription: dimDef?.description || '',
        }
      }),
    },
    // Raw answers so bespoke PDF renderers (e.g. commerce-branch) can recompute
    // their full report shape from source. Generic renderer ignores this field.
    answers: answerMap,
    // Smart Interpreter narrative (counsellor-grade, zero-cost, no LLM)
    interpretation: generateUniversalSmartInterpretation(
      getTestType(report.assessment.slug),
      report.student.name,
      extractInterpretationData(report.assessment.slug, result.dimensions, result.domainBreakdown, result.recommendation || undefined),
    ),
  }

  const buf = await generateReportPdfFile(pdfData, report.id)
  void req
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report-${report.assessment.slug}-${report.student.name.replace(/\s+/g, '_')}.pdf"`,
      'Content-Length': String(buf.length),
    },
  })
})

export const dynamic = 'force-dynamic'
