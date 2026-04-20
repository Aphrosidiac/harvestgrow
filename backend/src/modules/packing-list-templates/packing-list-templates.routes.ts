import { FastifyInstance } from 'fastify'
import { listPackingListTemplates, createPackingListTemplate, updatePackingListTemplate, deletePackingListTemplate } from './packing-list-templates.controller.js'

export default async function packingListTemplateRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listPackingListTemplates)
  fastify.post('/', createPackingListTemplate)
  fastify.put('/:id', updatePackingListTemplate)
  fastify.delete('/:id', deletePackingListTemplate)
}
