import { FastifyRequest } from 'fastify'

export type AuditEntry = {
  action: string
  entity: string
  entityId?: string | null
  changes?: Record<string, unknown> | null
}

export async function auditLog(request: FastifyRequest, entry: AuditEntry): Promise<void> {
  const user = (request as any).user as { userId?: string; branchId?: string } | undefined
  try {
    await request.server.prisma.auditLog.create({
      data: {
        branchId: user?.branchId ?? null,
        userId: user?.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        method: request.method,
        path: request.url,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
        changes: (entry.changes ?? null) as any,
      },
    })
  } catch (err) {
    request.log.error({ err }, 'audit log failed')
  }
}

export function diffChanges<T extends Record<string, any>>(before: T, after: Partial<T>): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of Object.keys(after)) {
    const b = before[key]
    const a = (after as any)[key]
    if (JSON.stringify(b) !== JSON.stringify(a)) diff[key] = { before: b, after: a }
  }
  return diff
}
