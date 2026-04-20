import { FastifyInstance } from 'fastify'
import {
  listSalesOrders,
  getSalesOrder,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  updateSalesOrderStatus,
  copySalesOrder,
} from './sales-orders.controller.js'

export default async function salesOrderRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listSalesOrders)
  fastify.get('/:id', getSalesOrder)
  fastify.post('/', createSalesOrder)
  fastify.put('/:id', updateSalesOrder)
  fastify.delete('/:id', deleteSalesOrder)
  fastify.patch('/:id/status', updateSalesOrderStatus)
  fastify.post('/:id/copy', copySalesOrder)
}
