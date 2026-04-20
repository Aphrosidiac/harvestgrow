import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'

export async function listAssignments(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, truckId } = request.query as any

  const where: Prisma.TruckCustomerAssignmentWhereInput = {
    truck: { branchId },
    ...(truckId && { truckId }),
    ...(search && {
      OR: [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
        { customer: { companyCode: { contains: search, mode: 'insensitive' } } },
        { customer: { branchCode: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.truckCustomerAssignment.findMany({
      where,
      include: {
        truck: { select: { id: true, code: true, description: true } },
        customer: { select: { id: true, name: true, companyName: true, companyCode: true, branchCode: true, branchLocation: true, country: true, phone: true } },
      },
      orderBy: [{ truck: { code: 'asc' } }, { level: 'asc' }],
      skip,
      take: limit,
    }),
    request.server.prisma.truckCustomerAssignment.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function createAssignment(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { truckId, customerId, level } = request.body as any

  if (!truckId || !customerId) {
    return reply.status(400).send({ success: false, message: 'Truck and customer are required' })
  }

  const assignment = await request.server.prisma.truckCustomerAssignment.create({
    data: { truckId, customerId, level: parseInt(level) || 0 },
    include: {
      truck: { select: { id: true, code: true, description: true } },
      customer: { select: { id: true, name: true, companyName: true, companyCode: true } },
    },
  })

  return reply.status(201).send({ success: true, data: assignment })
}

export async function updateAssignment(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const { id } = request.params
  const { truckId, level } = request.body as any

  const assignment = await request.server.prisma.truckCustomerAssignment.update({
    where: { id },
    data: {
      ...(truckId && { truckId }),
      ...(level !== undefined && { level: parseInt(level) || 0 }),
    },
    include: {
      truck: { select: { id: true, code: true, description: true } },
      customer: { select: { id: true, name: true, companyName: true, companyCode: true } },
    },
  })

  return reply.send({ success: true, data: assignment })
}

export async function deleteAssignment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  await request.server.prisma.truckCustomerAssignment.delete({ where: { id: request.params.id } })
  return reply.send({ success: true, message: 'Assignment removed' })
}
