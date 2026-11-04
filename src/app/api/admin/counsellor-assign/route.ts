import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({ counsellorId: z.string(), studentIds: z.array(z.string()).min(1) })

// POST /api/admin/counsellor-assign — assign students to a counsellor.
export const POST = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('counsellorId and studentIds required', 400, parsed.error.flatten())
  const { counsellorId, studentIds } = parsed.data
  const counsellor = await db.user.findUnique({ where: { id: counsellorId } })
  if (!counsellor || counsellor.role !== 'COUNSELLOR') return error('Counsellor not found', 404)
  const created: string[] = []
  for (const sid of studentIds) {
    const existing = await db.counsellorStudent.findFirst({ where: { counsellorId, studentId: sid } })
    if (existing) continue
    await db.counsellorStudent.create({ data: { counsellorId, studentId: sid, assignedById: admin.id } })
    created.push(sid)
  }
  await audit('STUDENTS_ASSIGNED_TO_COUNSELLOR', { actor: admin, targetType: 'USER', targetId: counsellorId, metadata: { students: created } })
  return json({ assigned: created, count: created.length })
})

export const dynamic = 'force-dynamic'
