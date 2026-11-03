import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, hashPassword } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

// GET /api/admin/counsellors — list all counsellors.
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const counsellors = await db.user.findMany({
    where: { role: 'COUNSELLOR' }, orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
      counsellorStudents: { select: { student: { select: { id: true, name: true, email: true } } } } },
  })
  return json({ counsellors })
})

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  password: z.string().min(8).optional(),
})

// POST /api/admin/counsellors — create a counsellor account.
export const POST = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('Validation failed', 400, parsed.error.flatten().fieldErrors)
  const { name, email, phone, password } = parsed.data
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return error('A counsellor with this email already exists', 409)
  const counsellor = await db.user.create({
    data: { name, email: email.toLowerCase(), phone, role: 'COUNSELLOR', passwordHash: hashPassword(password || 'Counsellor@123'), isActive: true },
  })
  await audit('COUNSELLOR_CREATED', { actor: admin, targetType: 'USER', targetId: counsellor.id })
  return json({ counsellor: { id: counsellor.id, name, email, phone } }, 201)
})

export const dynamic = 'force-dynamic'
