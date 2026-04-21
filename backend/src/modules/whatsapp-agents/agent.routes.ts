import { FastifyInstance } from 'fastify'
import { getAgentSettings, updateAgentSettings, listChats, getChatMessages, deleteChat, getAgentStats } from './agent.controller.js'

export default async function whatsappAgentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/settings', getAgentSettings)
  fastify.put('/settings', updateAgentSettings)
  fastify.get('/chats', listChats)
  fastify.get('/chats/:id/messages', getChatMessages)
  fastify.delete('/chats/:id', deleteChat)
  fastify.get('/stats', getAgentStats)
}
