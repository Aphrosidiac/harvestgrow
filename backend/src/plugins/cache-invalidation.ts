import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

/**
 * Auto-invalidate dashboard cache on mutating requests to relevant endpoints.
 * This avoids patching every controller — any POST/PUT/DELETE to documents,
 * stock, customers, or payments clears the dashboard cache for that user's branch.
 */
const cacheInvalidationPlugin: FastifyPluginAsync = async (fastify) => {
  const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
  const invalidationPrefixes = [
    '/api/v1/documents',
    '/api/v1/stock',
    '/api/v1/customers',
  ]

  fastify.addHook('onResponse', async (request, reply) => {
    // Only invalidate on successful mutations
    if (!mutatingMethods.has(request.method)) return
    if (reply.statusCode >= 400) return

    const shouldInvalidate = invalidationPrefixes.some((prefix) =>
      request.url.startsWith(prefix)
    )
    if (!shouldInvalidate) return

    const branchId = request.user?.branchId
    if (!branchId) return

    // Invalidate all dashboard caches for this branch
    await fastify.cache.invalidate(`dashboard:*:${branchId}`)
  })
}

export default fp(cacheInvalidationPlugin)
