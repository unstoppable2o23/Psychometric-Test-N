import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, generateSecureToken } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

const TOKEN_TTL_HOURS = 24

// Start (or resume) a test attempt and issue a unique secure access token.
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: assignmentId } = await params
  const user = requireRole(await getCurrentUser(), 'STUDENT')

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { assessment: true, attempts: true },
  })
  if (!assignment || assignment.studentId !== user.id) {
    return error('Assignment not found', 404)
  }
  if (assignment.status === 'COMPLETED') {
    return error('This assessment has already been completed. Retake is not available.', 409)
  }

  // Find or create the in-progress attempt (resume rather than duplicate)
  let attempt = assignment.attempts.find((a) => a.status === 'IN_PROGRESS')
  if (!attempt) {
    attempt = await db.attempt.create({
      data: {
        assignmentId: assignment.id, studentId: user.id, assessmentId: assignment.assessmentId,
        status: 'IN_PROGRESS', currentQuestionIndex: 0,
      },
    })
    await db.assignment.update({ where: { id: assignment.id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } })
  }

  // Revoke any previously-issued unused tokens for this assignment (single active link)
  await db.accessToken.updateMany({
    where: { assignmentId: assignment.id, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  })

  // Issue a fresh cryptographically-secure token
  const token = generateSecureToken(24)
  const access = await db.accessToken.create({
    data: {
      assignmentId: assignment.id, token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000),
    },
  })

  await audit('TOKEN_ISSUED', { actor: user, targetType: 'ASSIGNMENT', targetId: assignment.id, metadata: { tokenId: access.id, attemptId: attempt.id } })
  return json({ token, attemptId: attempt.id, assessment: assignment.assessment })
})

export const dynamic = 'force-dynamic'
