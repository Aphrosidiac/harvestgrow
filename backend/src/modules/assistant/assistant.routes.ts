import { FastifyInstance } from 'fastify'
import { chat } from './assistant.controller.js'

export default async function assistantRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.post('/chat', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req: any) => `assistant:${req.user.userId}`,
      },
    },
  }, chat)
}
