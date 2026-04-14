import { FastifyInstance } from 'fastify'
import { listDebtors, getDebtorDetail } from './debtors.controller.js'

export default async function debtorRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listDebtors)
  fastify.get('/:id', getDebtorDetail)
}
