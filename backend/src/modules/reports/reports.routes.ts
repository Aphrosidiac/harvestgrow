import { FastifyInstance } from 'fastify'
import {
  getDailyPaymentLog,
  getSalesReport,
  getOrdersReport,
  getStockMovementReport,
  getPriceHistoryReport,
  getDriverPerformanceReport,
  getExportImportReport,
  getWastageSummary,
  getSupplyReturnSummary,
  getSupplierSummary,
  getLowMarginSummary,
  getTruckMapReport,
} from './reports.controller.js'

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/payment-log', getDailyPaymentLog)
  fastify.get('/sales', getSalesReport)
  fastify.get('/orders', getOrdersReport)
  fastify.get('/stock-movement', getStockMovementReport)
  fastify.get('/price-history', getPriceHistoryReport)
  fastify.get('/drivers', getDriverPerformanceReport)
  fastify.get('/export-import', getExportImportReport)
  fastify.get('/wastage-summary', getWastageSummary)
  fastify.get('/supply-return-summary', getSupplyReturnSummary)
  fastify.get('/supplier-summary', getSupplierSummary)
  fastify.get('/low-margin-summary', getLowMarginSummary)
  fastify.get('/truck-map', getTruckMapReport)
}
