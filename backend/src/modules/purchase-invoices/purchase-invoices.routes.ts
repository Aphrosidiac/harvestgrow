import { FastifyInstance } from 'fastify'
import {
  listPurchaseInvoices,
  getPurchaseInvoice,
  createPurchaseInvoice,
  updatePurchaseInvoice,
  checkItem,
  checkAllItems,
  verifyInvoice,
  finalizeInvoice,
  cancelInvoice,
} from './purchase-invoices.controller.js'
import { requireRole } from '../../middleware/authorize.js'

export default async function purchaseInvoiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', requireRole('ADMIN', 'MANAGER'))

  fastify.get('/', listPurchaseInvoices)
  fastify.get('/:id', getPurchaseInvoice)
  fastify.post('/', createPurchaseInvoice)
  fastify.put('/:id', updatePurchaseInvoice)
  fastify.patch('/:id/items/:itemId/check', checkItem)
  fastify.patch('/:id/check-all', checkAllItems)
  fastify.post('/:id/verify', verifyInvoice)
  fastify.post('/:id/finalize', finalizeInvoice)
  fastify.post('/:id/cancel', cancelInvoice)
}
