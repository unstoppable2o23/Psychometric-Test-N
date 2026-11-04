import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, hashPassword } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

// GET /api/admin/students — list all students (with search).
export const GET = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const where = q ? {
    role: 'STUDENT' as const,
    OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }],
  } : { role: 'STUDENT' as const }
  const students = await db.user.findMany({
    where, orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
  })
  void admin
  return json({ students })
})

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional(),
  password: z.string().min(8).optional(),
  assignAssessmentIds: z.array(z.string()).optional(),
})

// POST /api/admin/students — register a student manually (+ optional immediate assignments).
export const POST = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return error('Validation failed', 400, parsed.error.flatten().fieldErrors)
  const { name, email, phone, password, assignAssessmentIds } = parsed.data

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return error('A student with this email already exists', 409)

  const student = await db.user.create({
    data: {
      name, email: email.toLowerCase(), phone: phone || null, role: 'STUDENT',
      passwordHash: hashPassword(password || 'Student@123'), isActive: true,
    },
  })

  // Optional immediate test assignments
  const assignments: { id: string; assessmentTitle: string }[] = []
  if (assignAssessmentIds?.length) {
    for (const aid of assignAssessmentIds) {
      const assessment = await db.assessment.findUnique({ where: { id: aid } })
      if (!assessment) continue
      const a = await db.assignment.create({
        data: { studentId: student.id, assessmentId: aid, assignedById: admin.id, status: 'ASSIGNED' },
      })
      assignments.push({ id: a.id, assessmentTitle: assessment.title })
    }
  }

  await audit('STUDENT_REGISTERED_BY_ADMIN', { actor: admin, targetType: 'USER', targetId: student.id, metadata: { assignments: assignments.length } })
  return json({ student: { id: student.id, name, email, phone }, assignments }, 201)
})

export const dynamic = 'force-dynamic'
