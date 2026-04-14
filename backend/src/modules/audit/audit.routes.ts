import { FastifyPluginAsync } from 'fastify'
import { listAuditLogs } from './audit.controller.js'
import { requireRole } from '../../middleware/authorize.js'

const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', requireRole('ADMIN'))

  fastify.get('/', listAuditLogs)
}

export default auditRoutes
