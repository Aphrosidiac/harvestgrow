import Fastify from 'fastify'
import cors from '@fastify/cors'
import formbody from '@fastify/formbody'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './config/env.js'
import prismaPlugin from './plugins/prisma.js'
import redisPlugin from './plugins/redis.js'
import authPlugin from './plugins/auth.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import cacheInvalidationPlugin from './plugins/cache-invalidation.js'
import auditHookPlugin from './plugins/audit-hook.js'
import authRoutes from './modules/auth/auth.routes.js'
import categoryRoutes from './modules/categories/categories.routes.js'
import stockRoutes from './modules/stock/stock.routes.js'
import documentRoutes from './modules/documents/documents.routes.js'
import settingsRoutes from './modules/document-settings/settings.routes.js'
import paymentTermRoutes from './modules/payment-terms/terms.routes.js'
import dashboardRoutes from './modules/dashboard/dashboard.routes.js'
import profileRoutes from './modules/profile/profile.routes.js'
import customerRoutes from './modules/customers/customers.routes.js'
import staffRoutes from './modules/staff/staff.routes.js'
import debtorRoutes from './modules/debtors/debtors.routes.js'
import reportRoutes from './modules/reports/reports.routes.js'
import supplierRoutes from './modules/suppliers/suppliers.routes.js'
import purchaseInvoiceRoutes from './modules/purchase-invoices/purchase-invoices.routes.js'
import supplierPaymentRoutes from './modules/supplier-payments/supplier-payments.routes.js'
import assistantRoutes from './modules/assistant/assistant.routes.js'
import auditRoutes from './modules/audit/audit.routes.js'
import shopRoutes from './modules/shop/shop.routes.js'
import orderRoutes from './modules/orders/orders.routes.js'
import productionRoutes from './modules/production/production.routes.js'
import deliveryRoutes from './modules/delivery/delivery.routes.js'
import salesOrderRoutes from './modules/sales-orders/sales-orders.routes.js'
import customerGroupRoutes from './modules/customer-groups/customer-groups.routes.js'
import pricingBoardRoutes from './modules/pricing-boards/pricing-boards.routes.js'
import quotationTypeRoutes from './modules/quotation-types/quotation-types.routes.js'
import packingListTemplateRoutes from './modules/packing-list-templates/packing-list-templates.routes.js'
import productClearanceRoutes from './modules/product-clearance/product-clearance.routes.js'
import multipart from '@fastify/multipart'
import quotationCompareRoutes from './modules/quotation-compare/quotation-compare.routes.js'
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js'
import whatsappAgentRoutes from './modules/whatsapp-agents/agent.routes.js'
import * as agentService from './modules/whatsapp-agents/agent.service.js'
import * as waService from './modules/whatsapp/whatsapp.service.js'
import quotationBroadcastRoutes from './modules/quotation-broadcast/quotation-broadcast.routes.js'
import truckRoutes from './modules/trucks/trucks.routes.js'
import truckRouteRoutes from './modules/truck-routes/truck-routes.routes.js'

const isProd = env.NODE_ENV === 'production'

const app = Fastify({
  logger: isProd
    ? { level: 'info' }
    : { transport: { target: 'pino-pretty', options: { colorize: true } } },
})

async function start() {
  // Plugins (Redis first — rate limiter and cache depend on it)
  await app.register(cors, {
    origin: isProd ? env.CORS_ORIGIN.split(',') : env.CORS_ORIGIN,
    credentials: true,
  })
  await app.register(formbody)
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 10 } })
  await app.register(swagger, {
    openapi: {
      info: { title: 'HarvestGrow API', version: '1.0.0', description: 'HarvestGrow ERP API' },
      servers: [{ url: '/' }],
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })
  await app.register(prismaPlugin)
  await app.register(redisPlugin)

  // Security (rate limiter uses Redis store for cluster-wide state)
  await app.register(helmet, {
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    } : false,
  })
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: app.redis,
  })

  await app.register(authPlugin)
  await app.register(errorHandlerPlugin)
  await app.register(cacheInvalidationPlugin)
  await app.register(auditHookPlugin)

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(categoryRoutes, { prefix: '/api/v1/categories' })
  await app.register(stockRoutes, { prefix: '/api/v1/stock' })
  await app.register(documentRoutes, { prefix: '/api/v1/documents' })
  await app.register(settingsRoutes, { prefix: '/api/v1/document-settings' })
  await app.register(paymentTermRoutes, { prefix: '/api/v1/payment-terms' })
  await app.register(dashboardRoutes, { prefix: '/api/v1/dashboard' })
  await app.register(profileRoutes, { prefix: '/api/v1/profile' })
  await app.register(customerRoutes, { prefix: '/api/v1/customers' })
  await app.register(staffRoutes, { prefix: '/api/v1/staff' })
  await app.register(debtorRoutes, { prefix: '/api/v1/debtors' })
  await app.register(reportRoutes, { prefix: '/api/v1/reports' })
  await app.register(supplierRoutes, { prefix: '/api/v1/suppliers' })
  await app.register(purchaseInvoiceRoutes, { prefix: '/api/v1/purchase-invoices' })
  await app.register(supplierPaymentRoutes, { prefix: '/api/v1/supplier-payments' })
  await app.register(assistantRoutes, { prefix: '/api/v1/assistant' })
  await app.register(auditRoutes, { prefix: '/api/v1/audit' })
  await app.register(shopRoutes, { prefix: '/api/v1/shop' })
  await app.register(orderRoutes, { prefix: '/api/v1/orders' })
  await app.register(productionRoutes, { prefix: '/api/v1/production' })
  await app.register(deliveryRoutes, { prefix: '/api/v1/delivery' })
  await app.register(salesOrderRoutes, { prefix: '/api/v1/sales-orders' })
  await app.register(customerGroupRoutes, { prefix: '/api/v1/customer-groups' })
  await app.register(pricingBoardRoutes, { prefix: '/api/v1/pricing-boards' })
  await app.register(quotationCompareRoutes, { prefix: '/api/v1/quotation-compare' })
  await app.register(whatsappRoutes, { prefix: '/api/v1/whatsapp' })
  await app.register(whatsappAgentRoutes, { prefix: '/api/v1/whatsapp-agents' })
  await app.register(quotationBroadcastRoutes, { prefix: '/api/v1/quotation-broadcast' })
  await app.register(quotationTypeRoutes, { prefix: '/api/v1/quotation-types' })
  await app.register(packingListTemplateRoutes, { prefix: '/api/v1/packing-list-templates' })
  await app.register(productClearanceRoutes, { prefix: '/api/v1/product-clearance' })
  await app.register(truckRoutes, { prefix: '/api/v1/trucks' })
  await app.register(truckRouteRoutes, { prefix: '/api/v1/truck-routes' })

  // WhatsApp AI Agent hook
  agentService.init(app.prisma)
  waService.onMessage(agentService.processMessage)

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Start
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`\n  HarvestGrow API running on http://localhost:${env.PORT} (PID: ${process.pid})\n`)

    // Tell PM2 this instance is ready (for zero-downtime reloads)
    if (process.send) process.send('ready')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }

  // Graceful shutdown for PM2 cluster mode
  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received — shutting down gracefully`)
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start()
