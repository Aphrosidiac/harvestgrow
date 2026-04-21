import { FastifyInstance } from 'fastify'
import { getWhatsAppStatus, getWhatsAppQR, connectWhatsApp, disconnectWhatsApp, sendTestMessage } from './whatsapp.controller.js'
import { requireRole } from '../../middleware/authorize.js'

export default async function whatsappRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)
  fastify.addHook('preHandler', requireRole('ADMIN'))

  fastify.get('/status', getWhatsAppStatus)
  fastify.get('/qr', getWhatsAppQR)
  fastify.post('/connect', connectWhatsApp)
  fastify.post('/disconnect', disconnectWhatsApp)
  fastify.post('/send', sendTestMessage)
}
