import { FastifyInstance } from 'fastify'
import { listTrucks, createTruck, updateTruck, deleteTruck } from './trucks.controller.js'

export default async function truckRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listTrucks)
  fastify.post('/', createTruck)
  fastify.put('/:id', updateTruck)
  fastify.delete('/:id', deleteTruck)
}
