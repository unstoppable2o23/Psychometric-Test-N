import { db } from '@/lib/db'

export async function audit(
  action: string,
  opts: {
    // Minimal actor shape — call sites pass either a full AuthUser or a
    // lightweight { id, role } pair (e.g. when acting on behalf of a student).
    actor?: { id: string; role?: string | null } | null
    targetType?: string
    targetId?: string
    metadata?: Record<string, unknown>
    ip?: string
  } = {}
) {
  try {
    await db.auditLog.create({
      data: {
        action,
        actorId: opts.actor?.id ?? null,
        actorRole: opts.actor?.role ?? null,
        targetType: opts.targetType ?? null,
        targetId: opts.targetId ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        ip: opts.ip ?? null,
      },
    })
  } catch {
    // audit logging must never break the request
  }
}
