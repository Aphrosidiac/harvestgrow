import { FastifyInstance } from 'fastify'
import { listStaff, getStaff, createStaff, updateStaff, resetPassword } from './staff.controller.js'
import { requireRole } from '../../middleware/authorize.js'

export default async function staffRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', requireRole('ADMIN'))

  fastify.get('/', listStaff)
  fastify.get('/:id', getStaff)
  fastify.post('/', createStaff)
  fastify.put('/:id', updateStaff)
  fastify.post('/:id/reset-password', resetPassword)
}
