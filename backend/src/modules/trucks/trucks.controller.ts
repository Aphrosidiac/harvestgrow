import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'

export async function listTrucks(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search } = request.query as any

  const where: Prisma.TruckWhereInput = {
    branchId,
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.truck.findMany({
      where,
      orderBy: { code: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.truck.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function createTruck(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { code, description } = request.body as any

  if (!code?.trim()) {
    return reply.status(400).send({ success: false, message: 'Truck code is required' })
  }

  const truck = await request.server.prisma.truck.create({
    data: {
      branchId,
      code: code.trim().toUpperCase(),
      description: description?.trim() || '',
    },
  })

  return reply.status(201).send({ success: true, data: truck })
}

export async function updateTruck(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { code, description } = request.body as any

  const existing = await request.server.prisma.truck.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Truck not found' })
  }

  const truck = await request.server.prisma.truck.update({
    where: { id },
    data: {
      ...(code && { code: code.trim().toUpperCase() }),
      ...(description !== undefined && { description: description?.trim() || '' }),
    },
  })

  return reply.send({ success: true, data: truck })
}

export async function deleteTruck(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.truck.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Truck not found' })
  }

  await request.server.prisma.truck.delete({ where: { id } })
  return reply.send({ success: true, message: 'Truck deleted' })
}
