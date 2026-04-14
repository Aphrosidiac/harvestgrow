import { FastifyInstance } from 'fastify'
import {
  listOrders, getOrder, updateOrderStatus, cancelOrder,
  generateInvoice, generateDeliveryOrder, bulkGenerateInvoices, promoteCustomer,
} from './orders.controller.js'

export default async function orderRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listOrders)
  fastify.get('/:id', getOrder)
  fastify.patch('/:id/status', updateOrderStatus)
  fastify.post('/:id/cancel', cancelOrder)

  // Phase 5: document generation
  fastify.post('/:id/generate-invoice', generateInvoice)
  fastify.post('/:id/generate-do', generateDeliveryOrder)
  fastify.post('/:id/promote-customer', promoteCustomer)
  fastify.post('/bulk-generate-invoices', bulkGenerateInvoices)
}
