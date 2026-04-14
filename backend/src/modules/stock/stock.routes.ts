import { FastifyInstance } from 'fastify'
import {
  listStock, getStock, createStock, updateStock, deleteStock, adjustStock,
  getStockHistory, getAllStockHistory,
  bulkPriceUpdate, getPriceHistory, getLowStockItems,
} from './stock.controller.js'
import { requireRole } from '../../middleware/authorize.js'

export default async function stockRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listStock)
  fastify.get('/history', getAllStockHistory)
  fastify.get('/low-stock', getLowStockItems)
  fastify.post('/bulk-price-update', { preHandler: requireRole('ADMIN', 'MANAGER') }, bulkPriceUpdate as any)
  fastify.get('/:id', getStock)
  fastify.post('/', createStock)
  fastify.put('/:id', updateStock)
  fastify.delete('/:id', deleteStock)
  fastify.post('/:id/adjust', adjustStock)
  fastify.get('/:id/history', getStockHistory)
  fastify.get('/:id/price-history', getPriceHistory)
}
