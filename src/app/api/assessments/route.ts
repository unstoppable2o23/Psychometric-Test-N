import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'

// Public list of available assessments (metadata only — no questions/scoring).
export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  const where = user?.role === 'STUDENT' ? { isActive: true } : {}
  const assessments = await db.assessment.findMany({
    where,
    orderBy: { title: 'asc' },
    select: {
      id: true, slug: true, title: true, shortTitle: true,
      description: true, purpose: true, targetPopulation: true,
      estimatedMinutes: true, category: true, totalQuestions: true,
    },
  })
  return json({ assessments })
})

export const dynamic = 'force-dynamic'
