import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json } from '@/lib/api'

// GET /api/admin/analytics — dashboard summary stats.
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const [
    totalStudents, totalCounsellors, totalAssessments, assignedTests,
    pendingTests, inProgressTests, completedTests, reportsGenerated,
  ] = await Promise.all([
    db.user.count({ where: { role: 'STUDENT' } }),
    db.user.count({ where: { role: 'COUNSELLOR' } }),
    db.assessment.count({ where: { isActive: true } }),
    db.assignment.count(),
    db.assignment.count({ where: { status: 'ASSIGNED' } }),
    db.assignment.count({ where: { status: 'IN_PROGRESS' } }),
    db.assignment.count({ where: { status: 'COMPLETED' } }),
    db.report.count(),
  ])
  return json({
    totalStudents, totalCounsellors, totalAssessments, assignedTests,
    pendingTests, inProgressTests, completedTests, reportsGenerated,
    reportsAwaitingGeneration: pendingTests + inProgressTests,
  })
})

export const dynamic = 'force-dynamic'
