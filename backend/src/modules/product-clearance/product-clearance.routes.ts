import { FastifyInstance } from 'fastify'
import {
  listClearanceLists,
  getClearanceList,
  createClearanceList,
  updateClearanceStatus,
  deleteClearanceList,
} from './product-clearance.controller.js'

export default async function productClearanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listClearanceLists)
  fastify.get('/:id', getClearanceList)
  fastify.post('/', createClearanceList)
  fastify.patch('/:id/status', updateClearanceStatus)
  fastify.delete('/:id', deleteClearanceList)
}
