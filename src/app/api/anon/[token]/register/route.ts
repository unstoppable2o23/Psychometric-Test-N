import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { generateSecureToken, hashPassword } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Invalid mobile number'),
})

const TOKEN_TTL_HOURS = 72

// POST /api/anon/[token]/register — student registers via anonymous link
// Creates student account + assignment + attempt + test token (for platform TestRunner)
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const link = await db.anonymousTestLink.findUnique({
    where: { token },
    include: { assessment: true },
  })
  if (!link) return error('Invalid test link', 404)
  if (link.status === 'DISABLED') return error('This link has been disabled', 410)
  if (link.studentId) return error('This link has already been registered', 409)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('Validation failed', 400, parsed.error.flatten().fieldErrors)
  const { name, email, phone } = parsed.data

  // Find or create student
  let student = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!student) {
    student = await db.user.create({
      data: { name, email: email.toLowerCase(), phone, role: 'STUDENT', passwordHash: hashPassword(generateSecureToken(16)), isActive: true },
    })
  }

  // Create assignment + attempt
  const assignment = await db.assignment.create({
    data: { studentId: student.id, assessmentId: link.assessmentId, assignedById: link.createdById, status: 'IN_PROGRESS', startedAt: new Date() },
  })
  const attempt = await db.attempt.create({
    data: { assignmentId: assignment.id, studentId: student.id, assessmentId: link.assessmentId, status: 'IN_PROGRESS' },
  })

  // Generate a platform test token (for the TestRunner — supports resume)
  const testToken = generateSecureToken(24)
  await db.accessToken.create({
    data: { assignmentId: assignment.id, token: testToken, expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000) },
  })

  // Update link status
  await db.anonymousTestLink.update({
    where: { token },
    data: { studentId: student.id, assignmentId: assignment.id, status: 'REGISTERED' },
  })

  await audit('ANON_LINK_REGISTERED', { actor: { id: student.id, role: 'STUDENT' }, targetType: 'ANON_LINK', targetId: link.id, metadata: { name, email } })

  // Return the test token so the frontend can redirect to the platform TestRunner
  return json({ ok: true, studentId: student.id, testToken, assessment: link.assessment })
})
export const dynamic = 'force-dynamic'
