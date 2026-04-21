import { FastifyInstance } from 'fastify'
import {
  listSupplierCategories,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  assignSupplierCategory,
  broadcastQuotation,
} from './quotation-broadcast.controller.js'

export default async function quotationBroadcastRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/supplier-categories', listSupplierCategories)
  fastify.post('/supplier-categories', createSupplierCategory)
  fastify.put('/supplier-categories/:id', updateSupplierCategory)
  fastify.delete('/supplier-categories/:id', deleteSupplierCategory)
  fastify.post('/assign-category', assignSupplierCategory)
  fastify.post('/broadcast', broadcastQuotation)
}
