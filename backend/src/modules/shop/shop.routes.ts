import { FastifyInstance } from 'fastify'
import {
  getCategories, getProducts, getProduct, getCutoff,
  createOrder, trackOrder, shopLogin, shopMe, getOrderInvoice,
  priceCheck, shopMyOrders,
} from './shop.controller.js'

export default async function shopRoutes(fastify: FastifyInstance) {
  // Public browse
  fastify.get('/categories', getCategories)
  fastify.get('/products', getProducts)
  fastify.get('/products/:id', getProduct)
  fastify.get('/cutoff', getCutoff)

  // Public settings — whitelist of keys exposed to the storefront
  fastify.get('/settings', async (request, reply) => {
    const PUBLIC_KEYS = [
      'shop.whatsapp.link', 'shop.contact.email', 'shop.contact.phone',
      'shop.company.address', 'shop.company.phone',
      'shop.delivery.cutoffTime', 'shop.delivery.fee',
      'shop.minOrderAmount', 'shop.serviceable.postcodes',
    ]
    const rows = await request.server.prisma.setting.findMany({ where: { key: { in: PUBLIC_KEYS } } })
    const settings: Record<string, string> = {}
    for (const r of rows) settings[r.key] = r.value
    return reply.send({ success: true, data: settings })
  })

  // Orders
  fastify.post('/orders', createOrder)
  fastify.post('/price-check', priceCheck)
  fastify.get('/orders/:orderNumber', trackOrder)
  fastify.get('/orders/:orderNumber/invoice', getOrderInvoice)

  // Shop customer auth
  fastify.post('/customers/login', shopLogin)
  fastify.get('/customers/me', { preHandler: [fastify.authenticate] }, shopMe)
  fastify.get('/me/orders', { preHandler: [fastify.authenticate] }, shopMyOrders)
}
