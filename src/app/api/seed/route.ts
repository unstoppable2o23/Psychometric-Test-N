import { db } from '@/lib/db'
import { seedDatabase } from '@/lib/assessments/seed'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// First-run seeding is allowed without auth (so the platform can bootstrap).
// Re-seeding requires Super Admin.
export const POST = apiHandler(async () => {
  const user = await getCurrentUser()
  const adminExists = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (adminExists && (!user || user.role !== 'SUPER_ADMIN')) {
    return error('Seeding is restricted to Super Admin after initial setup', 403)
  }
  const result = await seedDatabase()
  await audit('SEED_DATABASE', { actor: user, targetType: 'SYSTEM', metadata: result })
  return json({ ok: true, ...result })
})
