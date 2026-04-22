import { FastifyInstance } from 'fastify'
import { compareQuotations, listComparisons, getComparison, deleteComparison } from './quotation-compare.controller.js'

export default async function quotationCompareRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/', compareQuotations)
  fastify.get('/history', listComparisons)
  fastify.get('/history/:id', getComparison)
  fastify.delete('/history/:id', deleteComparison)
}
