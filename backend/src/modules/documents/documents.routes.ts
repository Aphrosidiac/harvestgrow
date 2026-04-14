import { FastifyInstance } from 'fastify'
import {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  updateDocumentStatus,
  addPayment,
  convertDocument,
} from './documents.controller.js'

export default async function documentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listDocuments)
  fastify.get('/:id', getDocument)
  fastify.post('/', createDocument)
  fastify.put('/:id', updateDocument)
  fastify.delete('/:id', deleteDocument)
  fastify.patch('/:id/status', updateDocumentStatus)
  fastify.post('/:id/payments', addPayment)
  fastify.post('/:id/convert', convertDocument)
}
