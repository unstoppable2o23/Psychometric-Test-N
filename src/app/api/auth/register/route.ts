import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createSession, setSessionCookie, hashPassword, AuthError } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[0-9+\-\s()]{7,15}$/, 'Invalid mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return error('Validation failed', 400, parsed.error.flatten().fieldErrors)
  }
  const { name, email, phone, password } = parsed.data
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return error('An account with this email already exists', 409)

  const user = await db.user.create({
    data: {
      name, email: email.toLowerCase(), phone,
      role: 'STUDENT', passwordHash: hashPassword(password), isActive: true,
    },
  })
  const token = await createSession(user.id)
  await setSessionCookie(token)
  await audit('STUDENT_REGISTERED', { actor: { id: user.id, role: user.role }, targetType: 'USER', targetId: user.id })
  const { passwordHash, ...safe } = user
  return json({ user: safe }, 201)
})
