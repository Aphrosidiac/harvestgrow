import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  listDrivers, createDriver, updateDriver,
  listReadyOrders, createTrip, listTrips, getTripDetail,
  updateStopSequence, removeStop, cancelTrip,
  getMyTrip, startMyTrip,
  markStopArrived, markStopDelivered, markStopFailed, markStopSkipped,
  getAlerts,
} from './delivery.controller.js'

function roleGate(roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = request.user as any
    if (!user || !roles.includes(user.role)) {
      return reply.status(403).send({ success: false, message: 'Insufficient permissions' })
    }
  }
}

const DISPATCH_ROLES = ['ADMIN', 'MANAGER']
const DRIVER_ROLES = ['DRIVER']
const DISPATCH_OR_DRIVER = ['ADMIN', 'MANAGER', 'DRIVER']

export default async function deliveryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate)

  // Dispatcher — drivers
  fastify.get('/drivers', { preHandler: roleGate(DISPATCH_ROLES) }, listDrivers as any)
  fastify.post('/drivers', { preHandler: roleGate(['ADMIN']) }, createDriver as any)
  fastify.patch('/drivers/:id', { preHandler: roleGate(['ADMIN']) }, updateDriver as any)

  // Dispatcher — ready orders + trips
  fastify.get('/ready-orders', { preHandler: roleGate(DISPATCH_ROLES) }, listReadyOrders as any)
  fastify.post('/trips', { preHandler: roleGate(DISPATCH_ROLES) }, createTrip as any)
  fastify.get('/trips', { preHandler: roleGate(DISPATCH_ROLES) }, listTrips as any)
  fastify.get('/trips/:id', { preHandler: roleGate(DISPATCH_OR_DRIVER) }, getTripDetail as any)
  fastify.patch('/stops/:id/sequence', { preHandler: roleGate(DISPATCH_ROLES) }, updateStopSequence as any)
  fastify.delete('/stops/:id', { preHandler: roleGate(DISPATCH_ROLES) }, removeStop as any)
  fastify.post('/trips/:id/cancel', { preHandler: roleGate(DISPATCH_ROLES) }, cancelTrip as any)

  // Alerts
  fastify.get('/alerts', { preHandler: roleGate(DISPATCH_ROLES) }, getAlerts as any)

  // Driver self
  fastify.get('/me/trip', { preHandler: roleGate(DRIVER_ROLES) }, getMyTrip as any)
  fastify.post('/me/trip/:id/start', { preHandler: roleGate(DRIVER_ROLES) }, startMyTrip as any)
  fastify.post('/me/stops/:id/arrived', { preHandler: roleGate(DRIVER_ROLES) }, markStopArrived as any)
  fastify.post('/me/stops/:id/delivered', { preHandler: roleGate(DRIVER_ROLES) }, markStopDelivered as any)
  fastify.post('/me/stops/:id/failed', { preHandler: roleGate(DRIVER_ROLES) }, markStopFailed as any)
  fastify.post('/me/stops/:id/skipped', { preHandler: roleGate(DRIVER_ROLES) }, markStopSkipped as any)
}
