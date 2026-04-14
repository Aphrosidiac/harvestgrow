import { FastifyInstance } from 'fastify'
import { login, getMe } from './auth.controller.js'

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', login)
  fastify.get('/me', { preHandler: [fastify.authenticate] }, getMe)
}
