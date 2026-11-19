import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { apiHandler, json, error } from '@/lib/api'

// GET /api/anon/[token] — get link status (for the student-facing page)
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ token: string }> }) => {
  const { token } = await params
  const link = await db.anonymousTestLink.findUnique({
    where: { token },
    include: {
      assessment: { select: { id: true, title: true, slug: true, shortTitle: true, description: true, instructions: true, totalQuestions: true, estimatedMinutes: true, category: true } },
      student: { select: { id: true, name: true, email: true } },
    },
  })
  if (!link) return error('Invalid or expired test link', 404)
  if (link.status === 'DISABLED') return error('This test link has been disabled', 410)
  return json({
    token: link.token,
    status: link.status,
    assessment: link.assessment,
    student: link.student,
    isRegistered: !!link.studentId,
    isCompleted: link.status === 'COMPLETED' || link.status === 'REPORT_GENERATED',
  })
})
export const dynamic = 'force-dynamic'
