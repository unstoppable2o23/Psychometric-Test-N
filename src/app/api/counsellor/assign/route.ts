import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, generateSecureToken } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const TOKEN_TTL_HOURS = 72

const schema = z.object({
  studentId: z.string(),
  assessmentId: z.string(),
})

// POST /api/counsellor/assign — a counsellor assigns an available test to a
// student. Consumes one credit from the counsellor's allocation, creates the
// assignment, and generates a unique secure test link immediately.
export const POST = apiHandler(async (req: NextRequest) => {
  const me = requireRole(await getCurrentUser(), 'COUNSELLOR')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('studentId and assessmentId are required', 400, parsed.error.flatten())
  const { studentId, assessmentId } = parsed.data

  // 1. Verify the student exists and is active
  const student = await db.user.findUnique({ where: { id: studentId } })
  if (!student || student.role !== 'STUDENT' || !student.isActive) {
    return error('Student not found or inactive', 404)
  }

  // 2. Verify the counsellor has an available credit for this assessment
  const alloc = await db.counsellorAllocation.findUnique({
    where: { counsellorId_assessmentId: { counsellorId: me.id, assessmentId } },
  })
  if (!alloc) return error('You do not have an allocation for this assessment', 403)
  const available = alloc.quantity - alloc.used
  if (available <= 0) return error(`No available credits for this assessment (${alloc.used}/${alloc.quantity} used)`, 403)

  // 3. Check for an existing active assignment (avoid duplicates)
  const existing = await db.assignment.findFirst({
    where: { studentId, assessmentId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
  })
  if (existing) {
    // If the existing assignment was created by this counsellor, return its link
    if (existing.assignedById === me.id) {
      const activeToken = await db.accessToken.findFirst({
        where: { assignmentId: existing.id, revokedAt: null, expiresAt: { gt: new Date() } },
      })
      if (activeToken) return json({ assignmentId: existing.id, token: activeToken.token, testUrl: `/?test=${activeToken.token}`, alreadyAssigned: true })
    }
    return error('This student already has an active assignment for this test', 409)
  }

  // 4. Create the assignment (attributed to the counsellor)
  const assignment = await db.assignment.create({
    data: { studentId, assessmentId, assignedById: me.id, status: 'ASSIGNED' },
  })

  // 5. Generate a unique secure token + access link immediately
  const token = generateSecureToken(24)
  await db.accessToken.create({
    data: { assignmentId: assignment.id, token, expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000) },
  })

  // 6. Consume one credit
  await db.counsellorAllocation.update({
    where: { id: alloc.id },
    data: { used: { increment: 1 } },
  })

  await audit('COUNSELLOR_ASSIGNED_TEST', { actor: me, targetType: 'ASSIGNMENT', targetId: assignment.id, metadata: { studentId, assessmentId, tokenId: token.slice(0, 8) } })

  return json({ assignmentId: assignment.id, token, testUrl: `/?test=${token}` })
})

export const dynamic = 'force-dynamic'
