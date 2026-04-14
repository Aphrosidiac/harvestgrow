import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  getBoard,
  getPackQueue,
  getOrderDetail,
  getPackSheet,
  markPicked,
  markPacked,
  getAlerts,
} from './production.controller.js'

const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER']

function roleGate(roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any
    if (!user || !roles.includes(user.role)) {
      return reply.status(403).send({ success: false, message: 'Insufficient permissions' })
    }
  }
}

export default async function productionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', roleGate(ALLOWED_ROLES))

  fastify.get('/board', getBoard)
  fastify.get('/pack-queue', getPackQueue)
  fastify.get('/alerts', getAlerts)
  fastify.get('/orders/:id', getOrderDetail)
  fastify.get('/orders/:id/pack-sheet', getPackSheet)
  fastify.post('/orders/:id/lines/:lineId/picked', markPicked)
  fastify.post('/orders/:id/lines/:lineId/packed', markPacked)
}
