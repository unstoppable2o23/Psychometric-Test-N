import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// POST /api/admin/reports/[id]/unlock
// Super Admin manually unlocks a report so the student can view/download it.
// This is the manual-authorization path used until a payment gateway is
// integrated. When a real gateway is added later, its verified callback will
// set the same paymentStatus = 'PAID'.
export const POST = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id } = await params
  const report = await db.report.findUnique({ where: { id } })
  if (!report) return error('Report not found', 404)

  await db.report.update({ where: { id }, data: { paymentStatus: 'PAID', paymentRequired: false } })
  await audit('REPORT_UNLOCKED', { actor: admin, targetType: 'REPORT', targetId: id })

  return json({ ok: true })
})

export const dynamic = 'force-dynamic'
