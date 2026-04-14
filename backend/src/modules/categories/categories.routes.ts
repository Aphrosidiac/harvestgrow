import { FastifyInstance } from 'fastify'
import { listCategories, createCategory, updateCategory, deleteCategory } from './categories.controller.js'

export default async function categoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listCategories)
  fastify.post('/', createCategory)
  fastify.put('/:id', updateCategory)
  fastify.delete('/:id', deleteCategory)
}
