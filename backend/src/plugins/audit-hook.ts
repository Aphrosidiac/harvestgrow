import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const SKIP_PATHS = [/^\/api\/health/, /^\/api\/v1\/auth\/refresh/]

const auditHookPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.method === 'GET' || request.method === 'OPTIONS' || request.method === 'HEAD') return
    if (SKIP_PATHS.some((re) => re.test(request.url))) return
    if (!request.url.startsWith('/api/')) return

    const user = (request as any).user as { userId?: string; branchId?: string } | undefined
    const entity = inferEntity(request.url)

    try {
      await fastify.prisma.auditLog.create({
        data: {
          branchId: user?.branchId ?? null,
          userId: user?.userId ?? null,
          action: 'REQUEST',
          entity,
          method: request.method,
          path: request.url,
          statusCode: reply.statusCode,
          ipAddress: request.ip,
          userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
        },
      })
    } catch (err) {
      request.log.error({ err }, 'audit hook failed')
    }
  })
}

function inferEntity(url: string): string {
  const m = url.match(/^\/api\/v1\/([^/?]+)/)
  return m?.[1] ?? 'unknown'
}

export default fp(auditHookPlugin, { name: 'audit-hook' })
