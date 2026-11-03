import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  studentIds: z.array(z.string()).min(1),
  assessmentIds: z.array(z.string()).min(1),
})

// POST /api/admin/assign — assign one or more tests to one or more students.
export const POST = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('Provide studentIds and assessmentIds arrays', 400, parsed.error.flatten())
  const { studentIds, assessmentIds } = parsed.data

  const created: { studentId: string; assessmentId: string; assignmentId: string }[] = []
  for (const sid of studentIds) {
    const student = await db.user.findUnique({ where: { id: sid } })
    if (!student || student.role !== 'STUDENT' || !student.isActive) continue
    for (const aid of assessmentIds) {
      const assessment = await db.assessment.findUnique({ where: { id: aid } })
      if (!assessment || !assessment.isActive) continue
      // Avoid duplicate active assignment for the same student+assessment
      const existing = await db.assignment.findFirst({
        where: { studentId: sid, assessmentId: aid, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      })
      if (existing) { created.push({ studentId: sid, assessmentId: aid, assignmentId: existing.id }); continue }
      const a = await db.assignment.create({
        data: { studentId: sid, assessmentId: aid, assignedById: admin.id, status: 'ASSIGNED' },
      })
      created.push({ studentId: sid, assessmentId: aid, assignmentId: a.id })
    }
  }
  await audit('TESTS_ASSIGNED', { actor: admin, targetType: 'ASSIGNMENT', metadata: { count: created.length } })
  return json({ assigned: created, count: created.length })
})

// GET /api/admin/assign — list all assignments with student + assessment info.
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const assignments = await db.assignment.findMany({
    include: {
      student: { select: { id: true, name: true, email: true, phone: true } },
      assessment: { select: { id: true, title: true, slug: true, category: true } },
      attempts: { select: { id: true, status: true, startedAt: true, completedAt: true, currentQuestionIndex: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return json({ assignments })
})

export const dynamic = 'force-dynamic'
