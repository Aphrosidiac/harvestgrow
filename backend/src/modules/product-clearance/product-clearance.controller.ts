import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma, ClearanceStatus } from '@prisma/client'

export async function listClearanceLists(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { from, to, search, status } = request.query as any

  const where: Prisma.ProductClearanceListWhereInput = {
    branchId,
    ...(status && { status: status as ClearanceStatus }),
    ...(from && to && {
      date: { gte: new Date(from), lte: new Date(to) },
    }),
    ...(from && !to && { date: { gte: new Date(from) } }),
    ...(!from && to && { date: { lte: new Date(to) } }),
    ...(search && {
      OR: [
        { status: { equals: search.toUpperCase() as any } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.productClearanceList.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.productClearanceList.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getClearanceList(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const list = await request.server.prisma.productClearanceList.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      items: {
        include: {
          stockItem: { select: { id: true, itemCode: true, description: true, uom: true, sellPrice: true, quantity: true, isPerishable: true, shelfLifeDays: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!list) {
    return reply.status(404).send({ success: false, message: 'Clearance list not found' })
  }

  return reply.send({ success: true, data: list })
}

export async function createClearanceList(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { date, autoPopulate } = request.body as any

  const targetDate = date ? new Date(date) : new Date()
  targetDate.setUTCHours(0, 0, 0, 0)

  const existing = await request.server.prisma.productClearanceList.findUnique({
    where: { branchId_date: { branchId, date: targetDate } },
  })
  if (existing) {
    return reply.status(400).send({ success: false, message: 'A clearance list for this date already exists' })
  }

  let itemCreates: any[] = []

  if (autoPopulate !== false) {
    const perishableItems = await request.server.prisma.stockItem.findMany({
      where: {
        branchId,
        isActive: true,
        isPerishable: true,
        quantity: { gt: 0 },
      },
      select: { id: true, quantity: true },
    })

    itemCreates = perishableItems.map((item) => ({
      stockItemId: item.id,
      quantity: item.quantity,
      reason: 'Auto-populated perishable item',
    }))
  }

  const list = await request.server.prisma.productClearanceList.create({
    data: {
      branchId,
      date: targetDate,
      createdById: userId,
      ...(itemCreates.length && { items: { create: itemCreates } }),
    },
    include: {
      _count: { select: { items: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  return reply.status(201).send({ success: true, data: list })
}

export async function updateClearanceStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { status } = request.body

  const existing = await request.server.prisma.productClearanceList.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Clearance list not found' })
  }

  if (status !== 'OPEN' && status !== 'CLOSED') {
    return reply.status(400).send({ success: false, message: 'Invalid status' })
  }

  const updated = await request.server.prisma.productClearanceList.update({
    where: { id },
    data: { status: status as ClearanceStatus },
    include: { _count: { select: { items: true } } },
  })

  return reply.send({ success: true, data: updated })
}

export async function deleteClearanceList(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.productClearanceList.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Clearance list not found' })
  }

  await request.server.prisma.productClearanceList.delete({ where: { id } })
  return reply.send({ success: true, message: 'Clearance list deleted' })
}
