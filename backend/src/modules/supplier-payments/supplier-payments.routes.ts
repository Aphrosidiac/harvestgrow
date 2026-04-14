import { FastifyInstance } from 'fastify'
import { listSupplierPayments, getSupplierPayment, createSupplierPayment, deleteSupplierPayment } from './supplier-payments.controller.js'
import { requireRole } from '../../middleware/authorize.js'

export default async function supplierPaymentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', requireRole('ADMIN', 'MANAGER'))

  fastify.get('/', listSupplierPayments)
  fastify.get('/:id', getSupplierPayment)
  fastify.post('/', createSupplierPayment)
  fastify.delete('/:id', deleteSupplierPayment)
}
