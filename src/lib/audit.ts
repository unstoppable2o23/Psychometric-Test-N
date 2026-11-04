import { db } from '@/lib/db'
import { AuthUser } from '@/lib/auth'

export async function audit(
  action: string,
  opts: {
    actor?: AuthUser | null
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
