import { FastifyInstance } from 'fastify'
import {
  listCustomerGroups,
  getCustomerGroup,
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
} from './customer-groups.controller.js'

export default async function customerGroupRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listCustomerGroups)
  fastify.get('/:id', getCustomerGroup)
  fastify.post('/', createCustomerGroup)
  fastify.put('/:id', updateCustomerGroup)
  fastify.delete('/:id', deleteCustomerGroup)
}
