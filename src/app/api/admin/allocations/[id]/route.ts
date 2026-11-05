import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// DELETE /api/admin/allocations/[id] — remove an allocation.
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = requireRole(await getCurrentUser(), 'SUPER_ADMIN')
  const { id } = await params
  const existing = await db.counsellorAllocation.findUnique({ where: { id } })
  if (!existing) return error('Allocation not found', 404)
  if (existing.used > 0) return error('Cannot delete an allocation that has already been used. Set the quantity to 0 instead.', 400)
  await db.counsellorAllocation.delete({ where: { id } })
  await audit('ALLOCATION_DELETED', { actor: admin, targetType: 'COUNSELLOR_ALLOCATION', targetId: id })
  return json({ ok: true })
})

export const dynamic = 'force-dynamic'
