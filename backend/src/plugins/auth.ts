import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import fjwt from '@fastify/jwt'
import { env } from '../config/env.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; branchId: string; role: string }
    user: { userId: string; branchId: string; role: string }
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fjwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '24h' },
  })

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ success: false, message: 'Unauthorized' })
    }
  })
}

export default fp(authPlugin)
