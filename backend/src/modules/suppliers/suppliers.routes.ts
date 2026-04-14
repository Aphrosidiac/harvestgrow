import { FastifyInstance } from 'fastify'
import { listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from './suppliers.controller.js'
import { requireRole } from '../../middleware/authorize.js'

export default async function supplierRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', requireRole('ADMIN', 'MANAGER'))

  fastify.get('/', listSuppliers)
  fastify.get('/:id', getSupplier)
  fastify.post('/', createSupplier)
  fastify.put('/:id', updateSupplier)
  fastify.delete('/:id', deleteSupplier)
}
