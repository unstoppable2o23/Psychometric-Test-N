import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'

// GET /api/counsellor/manuals/[assessmentId] — full interpretation manual content.
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ assessmentId: string }> }) => {
  requireRole(await getCurrentUser(), 'COUNSELLOR')
  const { assessmentId } = await params
  const manual = await db.interpretationManual.findFirst({ where: { assessmentId } })
  if (!manual) return error('Manual not found', 404)
  return json({ manual: { id: manual.id, title: manual.title, content: JSON.parse(manual.content) } })
})

export const dynamic = 'force-dynamic'
