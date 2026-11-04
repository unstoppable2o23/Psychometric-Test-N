import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({ counsellorIds: z.array(z.string()).min(1) })

// POST /api/admin/reports/[id]/assign — grant counsellor(s) access to a report.
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id: reportId } = await params
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return error('counsellorIds array required', 400)
  const report = await db.report.findUnique({ where: { id: reportId } })
  if (!report) return error('Report not found', 404)
  const created: string[] = []
  for (const cid of parsed.data.counsellorIds) {
    const c = await db.user.findUnique({ where: { id: cid } })
    if (!c || c.role !== 'COUNSELLOR') continue
    const existing = await db.counsellorReportAccess.findFirst({ where: { counsellorId: cid, reportId } })
    if (existing) continue
    await db.counsellorReportAccess.create({ data: { counsellorId: cid, reportId, grantedById: admin.id } })
    created.push(cid)
  }
  await audit('REPORT_ASSIGNED_TO_COUNSELLOR', { actor: admin, targetType: 'REPORT', targetId: reportId, metadata: { counsellors: created } })
  return json({ assigned: created, count: created.length })
})

export const dynamic = 'force-dynamic'
