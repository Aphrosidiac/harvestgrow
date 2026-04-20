import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma, PricingBoardStatus } from '@prisma/client'

export async function listBoards(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, termDays } = request.query as any

  const where: Prisma.PricingBoardWhereInput = {
    branchId,
    ...(termDays && { termDays: parseInt(termDays) }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.pricingBoard.findMany({
      where,
      include: {
        groups: { include: { customerGroup: { select: { id: true, name: true } } } },
        _count: { select: { items: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ termDays: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    request.server.prisma.pricingBoard.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getBoard(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const board = await request.server.prisma.pricingBoard.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      items: {
        include: { stockItem: { select: { id: true, itemCode: true, description: true, uom: true, sellPrice: true } } },
        orderBy: { stockItem: { itemCode: 'asc' } },
      },
      groups: { include: { customerGroup: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })
  if (!board) {
    return reply.status(404).send({ success: false, message: 'Pricing board not found' })
  }
  return reply.send({ success: true, data: board })
}

export async function createBoard(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { name, termDays, validFrom, validTo, remarks, customerGroupIds, items } = request.body as any

  if (!name?.trim() || !termDays || !validFrom || !validTo) {
    return reply.status(400).send({ success: false, message: 'Name, term days, valid from, and valid to are required' })
  }

  const board = await request.server.prisma.pricingBoard.create({
    data: {
      branchId,
      name: name.trim(),
      termDays: parseInt(termDays),
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      remarks: remarks?.trim() || null,
      createdById: userId,
      ...(customerGroupIds?.length && {
        groups: {
          create: customerGroupIds.map((cgId: string) => ({ customerGroupId: cgId })),
        },
      }),
      ...(items?.length && {
        items: {
          create: items.map((i: any) => ({
            stockItemId: i.stockItemId,
            price: Number(i.price),
          })),
        },
      }),
    },
    include: {
      groups: { include: { customerGroup: { select: { id: true, name: true } } } },
      _count: { select: { items: true } },
    },
  })

  return reply.status(201).send({ success: true, data: board })
}

export async function updateBoard(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, termDays, validFrom, validTo, remarks, customerGroupIds, items } = request.body as any

  const existing = await request.server.prisma.pricingBoard.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Pricing board not found' })
  }

  await request.server.prisma.$transaction(async (tx) => {
    if (customerGroupIds !== undefined) {
      await tx.pricingBoardGroup.deleteMany({ where: { pricingBoardId: id } })
    }
    if (items !== undefined) {
      await tx.pricingBoardItem.deleteMany({ where: { pricingBoardId: id } })
    }

    await tx.pricingBoard.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(termDays && { termDays: parseInt(termDays) }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validTo && { validTo: new Date(validTo) }),
        ...(remarks !== undefined && { remarks: remarks?.trim() || null }),
        ...(customerGroupIds !== undefined && {
          groups: {
            create: customerGroupIds.map((cgId: string) => ({ customerGroupId: cgId })),
          },
        }),
        ...(items !== undefined && {
          items: {
            create: items.map((i: any) => ({
              stockItemId: i.stockItemId,
              price: Number(i.price),
            })),
          },
        }),
      },
    })
  })

  const updated = await request.server.prisma.pricingBoard.findUnique({
    where: { id },
    include: {
      groups: { include: { customerGroup: { select: { id: true, name: true } } } },
      _count: { select: { items: true } },
    },
  })

  return reply.send({ success: true, data: updated })
}

export async function deleteBoard(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.pricingBoard.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Pricing board not found' })
  }
  if (existing.status !== 'DRAFT') {
    return reply.status(400).send({ success: false, message: 'Only DRAFT boards can be deleted' })
  }

  await request.server.prisma.pricingBoard.delete({ where: { id } })
  return reply.send({ success: true, message: 'Pricing board deleted' })
}

export async function updateBoardStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { status } = request.body

  const existing = await request.server.prisma.pricingBoard.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Pricing board not found' })
  }

  const transitions: Record<string, string[]> = {
    DRAFT: ['PROCEED'],
    PROCEED: ['EXPIRED'],
    EXPIRED: [],
  }
  if (!transitions[existing.status]?.includes(status)) {
    return reply.status(400).send({ success: false, message: `Cannot transition from ${existing.status} to ${status}` })
  }

  const updated = await request.server.prisma.pricingBoard.update({
    where: { id },
    data: { status: status as PricingBoardStatus },
  })

  return reply.send({ success: true, data: updated })
}

export async function copyBoard(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params

  const source = await request.server.prisma.pricingBoard.findFirst({
    where: { id, branchId },
    include: { items: true, groups: true },
  })
  if (!source) {
    return reply.status(404).send({ success: false, message: 'Pricing board not found' })
  }

  const copy = await request.server.prisma.pricingBoard.create({
    data: {
      branchId,
      name: `${source.name} (Copy)`,
      termDays: source.termDays,
      validFrom: source.validFrom,
      validTo: source.validTo,
      remarks: source.remarks,
      status: 'DRAFT',
      createdById: userId,
      groups: {
        create: source.groups.map((g) => ({ customerGroupId: g.customerGroupId })),
      },
      items: {
        create: source.items.map((i) => ({
          stockItemId: i.stockItemId,
          price: i.price,
        })),
      },
    },
    include: {
      groups: { include: { customerGroup: { select: { id: true, name: true } } } },
      _count: { select: { items: true } },
    },
  })

  return reply.status(201).send({ success: true, data: copy })
}

export async function listDailySnapshots(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { page, limit, skip } = getPaginationParams(request.query)

  const snapshots = await request.server.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
    SELECT DATE("changedAt") as date, COUNT(*) as count
    FROM price_history
    GROUP BY DATE("changedAt")
    ORDER BY date DESC
    LIMIT ${limit} OFFSET ${skip}
  `

  const totalResult = await request.server.prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT DATE("changedAt")) as count FROM price_history
  `
  const total = Number(totalResult[0]?.count || 0)

  const data = snapshots.map((s) => ({
    date: s.date,
    items: Number(s.count),
  }))

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getDailySnapshot(
  request: FastifyRequest<{ Params: { date: string } }>,
  reply: FastifyReply
) {
  const { date } = request.params
  const startOfDay = new Date(date)
  const endOfDay = new Date(date + 'T23:59:59.999Z')

  const entries = await request.server.prisma.priceHistory.findMany({
    where: {
      changedAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      stockItem: { select: { id: true, itemCode: true, description: true, uom: true } },
      changedBy: { select: { id: true, name: true } },
    },
    orderBy: { changedAt: 'desc' },
  })

  return reply.send({ success: true, data: entries })
}
