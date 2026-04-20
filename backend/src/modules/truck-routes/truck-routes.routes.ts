import { FastifyInstance } from 'fastify'
import { listAssignments, createAssignment, updateAssignment, deleteAssignment } from './truck-routes.controller.js'

export default async function truckRouteRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listAssignments)
  fastify.post('/', createAssignment)
  fastify.put('/:id', updateAssignment)
  fastify.delete('/:id', deleteAssignment)
}
