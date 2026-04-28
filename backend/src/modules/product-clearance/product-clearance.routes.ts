import { FastifyInstance } from 'fastify'
import {
  getClearanceSettings,
  updateClearanceSettings,
  listClearanceLists,
  getClearanceList,
  createClearanceList,
  bulkSaveClearanceItems,
  updateClearanceStatus,
  deleteClearanceList,
} from './product-clearance.controller.js'

export default async function productClearanceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/settings', getClearanceSettings)
  fastify.put('/settings', updateClearanceSettings)
  fastify.get('/', listClearanceLists)
  fastify.get('/:id', getClearanceList)
  fastify.post('/', createClearanceList)
  fastify.put('/:id/items', bulkSaveClearanceItems)
  fastify.patch('/:id/status', updateClearanceStatus)
  fastify.delete('/:id', deleteClearanceList)
}
