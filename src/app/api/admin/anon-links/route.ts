import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole, generateSecureToken } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// GET /api/admin/anon-links — list all anonymous test links
export const GET = apiHandler(async () => {
  requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const links = await db.anonymousTestLink.findMany({
    include: {
      assessment: { select: { id: true, title: true, slug: true, category: true, totalQuestions: true } },
      student: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return json({ links: links.map((l) => ({ ...l, shareUrl: `/anon/${l.token}` })) })
})

// POST /api/admin/anon-links — generate anonymous test link(s)
export const POST = apiHandler(async (req: NextRequest) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const body = await req.json().catch(() => null)
  const { assessmentId, count } = body || {}
  if (!assessmentId) return error('assessmentId is required', 400)
  const assessment = await db.assessment.findUnique({ where: { id: assessmentId } })
  if (!assessment) return error('Assessment not found', 404)

  const numLinks = Math.min(Math.max(count || 1, 1), 50)
  const created: any[] = []
  for (let i = 0; i < numLinks; i++) {
    const token = generateSecureToken(12)
    const link = await db.anonymousTestLink.create({
      data: { token, assessmentId, createdById: admin.id, status: 'UNUSED' },
    })
    created.push({ id: link.id, token: link.token, shareUrl: `/anon/${link.token}` })
  }
  await audit('ANON_LINKS_GENERATED', { actor: admin, targetType: 'ASSESSMENT', targetId: assessmentId, metadata: { count: numLinks } })
  return json({ links: created, count: created.length })
})
export const dynamic = 'force-dynamic'
