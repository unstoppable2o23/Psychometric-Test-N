import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// PATCH /api/admin/students/[id] — activate/deactivate or edit student info.
export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive
  if (typeof body.name === 'string') data.name = body.name
  if (typeof body.phone === 'string') data.phone = body.phone
  const student = await db.user.update({ where: { id }, data })
  await audit('STUDENT_UPDATED', { actor: admin, targetType: 'USER', targetId: id, metadata: body })
  return json({ student: { id: student.id, name: student.name, email: student.email, phone: student.phone, isActive: student.isActive } })
})

// GET /api/admin/students/[id] — student profile with assignments + reports.
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id } = await params
  const student = await db.user.findUnique({
    where: { id },
    include: {
      studentAssignments: { include: { assessment: true, attempts: true }, orderBy: { createdAt: 'desc' } },
      reportsAsStudent: { include: { assessment: true, attempt: true } },
    },
  })
  if (!student || student.role !== 'STUDENT') return error('Student not found', 404)
  const { passwordHash, ...safe } = student
  return json({ student: safe })
})

export const dynamic = 'force-dynamic'
