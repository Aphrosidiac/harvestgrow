import { FastifyInstance } from 'fastify'
import {
  getDailyPaymentLog,
  getSalesReport,
  getOrdersReport,
  getStockMovementReport,
  getPriceHistoryReport,
  getDriverPerformanceReport,
} from './reports.controller.js'

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/payment-log', getDailyPaymentLog)
  fastify.get('/sales', getSalesReport)
  fastify.get('/orders', getOrdersReport)
  fastify.get('/stock-movement', getStockMovementReport)
  fastify.get('/price-history', getPriceHistoryReport)
  fastify.get('/drivers', getDriverPerformanceReport)
}
