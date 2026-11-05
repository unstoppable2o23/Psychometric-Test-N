import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, AuthError } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({ password: z.string().min(8, 'Password must be at least 8 characters') })

// POST /api/students/[id]/reset-password
// Super Admin: any student. Counsellor: only students assigned to them.
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return error('Authentication required', 401)
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'COUNSELLOR') {
    return error('Only administrators and counsellors may reset student passwords', 403)
  }
  const { id } = await params
  const student = await db.user.findUnique({ where: { id } })
  if (!student || student.role !== 'STUDENT') return error('Student not found', 404)

  // Counsellors may only reset passwords for students assigned to them
  if (user.role === 'COUNSELLOR') {
    const assigned = await db.counsellorStudent.findFirst({
      where: { counsellorId: user.id, studentId: id },
    })
    if (!assigned) return error('You are not authorised to manage this student', 403)
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('Validation failed', 400, parsed.error.flatten().fieldErrors)

  await db.user.update({ where: { id }, data: { passwordHash: hashPassword(parsed.data.password) } })
  await audit('STUDENT_PASSWORD_RESET', { actor: user, targetType: 'USER', targetId: id })

  return json({ ok: true })
})

export const dynamic = 'force-dynamic'
