import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'

// GET /api/student/dashboard — the logged-in student's assignments + report access status.
export const GET = apiHandler(async () => {
  const user = requireRole(await getCurrentUser(), 'STUDENT')
  const assignments = await db.assignment.findMany({
    where: { studentId: user.id },
    include: { assessment: { select: { id: true, slug: true, title: true, shortTitle: true, description: true, estimatedMinutes: true, totalQuestions: true, category: true, instructions: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Report access: students cannot view reports until payment integration exists.
  // The dashboard still shows report availability status.
  const reports = await db.report.findMany({
    where: { studentId: user.id },
    select: { id: true, assessmentId: true, paymentStatus: true, generatedAt: true },
  })

  const items = assignments.map((a) => {
    const report = reports.find((r) => r.assessmentId === a.assessmentId)
    const status = a.status // ASSIGNED | IN_PROGRESS | COMPLETED
    let button: 'START' | 'CONTINUE' | 'COMPLETED' | 'VIEW_REPORT'
    if (status === 'ASSIGNED') button = 'START'
    else if (status === 'IN_PROGRESS') button = 'CONTINUE'
    else if (report && report.paymentStatus === 'PAID') button = 'VIEW_REPORT'
    else button = 'COMPLETED'
    return {
      id: a.id,
      status,
      button,
      assignedAt: a.createdAt,
      completedAt: a.completedAt,
      startedAt: a.startedAt,
      assessment: a.assessment,
      reportAvailable: !!report,
      reportId: report?.id ?? null,
      reportPaymentStatus: report?.paymentStatus ?? null,
    }
  })

  return json({ student: { id: user.id, name: user.name, email: user.email }, assignments: items })
})

export const dynamic = 'force-dynamic'
