import { FastifyInstance } from 'fastify'
import { listSettings, updateSettings, listKeyValueSettings, bulkUpdateKeyValueSettings } from './settings.controller.js'

export default async function settingsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // Document type settings
  fastify.get('/', listSettings)
  fastify.put('/:type', updateSettings)

  // Key-value settings (Setting table) — for shop / invoice / automation
  fastify.get('/keys', listKeyValueSettings)
  fastify.put('/keys', {
    preHandler: async (req, rep) => {
      if (req.user?.role !== 'ADMIN') return rep.status(403).send({ success: false, message: 'Admin only' })
    },
  }, bulkUpdateKeyValueSettings)
}
