import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, generateSecureToken } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// GET /api/admin/share-links — list all unique shareable test links
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const assessments = await db.assessment.findMany({
    where: { isActive: true },
    select: { id: true, title: true, slug: true, category: true, totalQuestions: true, estimatedMinutes: true },
    orderBy: { title: 'asc' },
  })
  const links = assessments.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    category: a.category,
    totalQuestions: a.totalQuestions,
    estimatedMinutes: a.estimatedMinutes,
    shareUrl: `/test/${a.slug}`,
  }))
  return json({ links })
})

export const dynamic = 'force-dynamic'
