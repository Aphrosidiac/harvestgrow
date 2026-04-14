import { FastifyInstance } from 'fastify'
import {
  listCustomers, searchCustomers, getCustomer, createCustomer,
  updateCustomer, deleteCustomer, addVehicle, updateVehicle, deleteVehicle,
} from './customers.controller.js'

export default async function customerRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  fastify.get('/', listCustomers)
  fastify.get('/search', searchCustomers)
  fastify.get('/:id', getCustomer)
  fastify.post('/', createCustomer)
  fastify.put('/:id', updateCustomer)
  fastify.delete('/:id', deleteCustomer)
  fastify.post('/:id/vehicles', addVehicle)
  fastify.put('/:id/vehicles/:vid', updateVehicle)
  fastify.delete('/:id/vehicles/:vid', deleteVehicle)
}
