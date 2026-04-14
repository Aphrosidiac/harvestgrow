import { FastifyInstance } from 'fastify'
import { getStats, getRevenueChart, getLowStock, getRecentInvoices, getActionItems, getRecentActivity } from './dashboard.controller.js'

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/stats', getStats)
  fastify.get('/revenue-chart', getRevenueChart)
  fastify.get('/low-stock', getLowStock)
  fastify.get('/recent-invoices', getRecentInvoices)
  fastify.get('/action-items', getActionItems)
  fastify.get('/activity', getRecentActivity)
}
