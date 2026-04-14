import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'

/**
 * Creates a Fastify preHandler that checks the user's role.
 * Use after fastify.authenticate.
 *
 * Usage: fastify.addHook('preHandler', requireRole('ADMIN', 'MANAGER'))
 */
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role as Role
    if (!userRole || !roles.includes(userRole)) {
      return reply.status(403).send({
        success: false,
        message: 'Insufficient permissions',
      })
    }
  }
}
