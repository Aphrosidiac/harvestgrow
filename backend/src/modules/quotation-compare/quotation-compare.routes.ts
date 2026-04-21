import { FastifyInstance } from 'fastify'
import { compareQuotations } from './quotation-compare.controller.js'

export default async function quotationCompareRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.post('/', compareQuotations)
}
