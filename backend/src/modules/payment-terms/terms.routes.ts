import { FastifyInstance } from 'fastify'
import { listTerms, createTerm, updateTerm, deleteTerm } from './terms.controller.js'

export default async function paymentTermRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.get('/', listTerms)
  fastify.post('/', createTerm)
  fastify.put('/:id', updateTerm)
  fastify.delete('/:id', deleteTerm)
}
