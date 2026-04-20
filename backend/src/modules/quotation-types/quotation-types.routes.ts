import { FastifyInstance } from 'fastify'
import { listQuotationTypes, createQuotationType, updateQuotationType, deleteQuotationType, copyQuotationType } from './quotation-types.controller.js'

export default async function quotationTypeRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listQuotationTypes)
  fastify.post('/', createQuotationType)
  fastify.put('/:id', updateQuotationType)
  fastify.delete('/:id', deleteQuotationType)
  fastify.post('/:id/copy', copyQuotationType)
}
