import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, generateSecureToken } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

const TOKEN_TTL_HOURS = 168 // 7 days

// GET /api/admin/test-links — list all generated direct test links
export const GET = apiHandler(async () => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const tokens = await db.accessToken.findMany({
    include: {
      assignment: {
        include: {
          student: { select: { id: true, name: true, email: true } },
          assessment: { select: { id: true, title: true, slug: true, totalQuestions: true } },
          attempts: { select: { id: true, status: true, completedAt: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  const links = tokens.map((t) => ({
    id: t.id,
    token: t.token,
    testUrl: `/?test=${t.token}`,
    studentName: t.assignment.student.name,
    studentEmail: t.assignment.student.email,
    testTitle: t.assignment.assessment.title,
    testSlug: t.assignment.assessment.slug,
    totalQuestions: t.assignment.assessment.totalQuestions,
    status: t.revokedAt ? 'Deactivated' : t.usedAt ? 'Used' : t.expiresAt < new Date() ? 'Expired' : 'Active',
    assignmentStatus: t.assignment.status,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    completedAt: t.assignment.attempts[0]?.completedAt || t.assignment.completedAt,
  }))
  return json({ links })
})

// POST /api/admin/test-links — generate a direct test link for a student + assessment
export const POST = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const body = await req.json().catch(() => null)
  const { studentId, assessmentId } = body || {}
  if (!studentId || !assessmentId) return error('studentId and assessmentId are required', 400)

  const student = await db.user.findUnique({ where: { id: studentId } })
  if (!student || student.role !== 'STUDENT') return error('Student not found', 404)
  const assessment = await db.assessment.findUnique({ where: { id: assessmentId } })
  if (!assessment) return error('Assessment not found', 404)

  // Check for existing active assignment
  const existing = await db.assignment.findFirst({
    where: { studentId, assessmentId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    include: { tokens: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, take: 1 } },
  })
  if (existing && existing.tokens.length > 0) {
    // Return existing active link
    return json({
      link: {
        token: existing.tokens[0].token,
        testUrl: `/?test=${existing.tokens[0].token}`,
        studentName: student.name,
        testTitle: assessment.title,
      },
      alreadyExists: true,
    })
  }

  // Create assignment + token
  const assignment = existing || await db.assignment.create({
    data: { studentId, assessmentId, assignedById: admin.id, status: 'ASSIGNED' },
  })

  const token = generateSecureToken(24)
  await db.accessToken.create({
    data: { assignmentId: assignment.id, token, expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000) },
  })

  await audit('DIRECT_TEST_LINK_GENERATED', { actor: admin, targetType: 'ASSIGNMENT', targetId: assignment.id, metadata: { studentId, assessmentId } })

  return json({
    link: { token, testUrl: `/?test=${token}`, studentName: student.name, testTitle: assessment.title },
  })
})

export const dynamic = 'force-dynamic'
