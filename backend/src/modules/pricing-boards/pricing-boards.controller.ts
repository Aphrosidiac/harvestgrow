import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { validate } from '../../utils/validation.js'
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

// ─── MATRIX ────────────────────────────────────────────────

export async function getMatrix(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, termDays, country, productCode, customerGroupId } = request.query as any

  const boardWhere: Prisma.PricingBoardWhereInput = {
    branchId,
    status: { in: ['PROCEED', 'DRAFT'] },
    ...(termDays && { termDays: parseInt(termDays) }),
    ...(customerGroupId && { groups: { some: { customerGroupId } } }),
    ...(country && { groups: { some: { customerGroup: { country } } } }),
  }

  const boards = await request.server.prisma.pricingBoard.findMany({
    where: boardWhere,
    select: { id: true, name: true, termDays: true, status: true },
    orderBy: [{ termDays: 'asc' }, { name: 'asc' }],
  })

  const itemWhere: Prisma.StockItemWhereInput = {
    branchId,
    isActive: true,
    ...(search && {
      OR: [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(productCode && { itemCode: { startsWith: productCode, mode: 'insensitive' } }),
  }

  const [items, total] = await Promise.all([
    request.server.prisma.stockItem.findMany({
      where: itemWhere,
      select: { id: true, itemCode: true, description: true, uom: true, costPrice: true, sellPrice: true },
      orderBy: { itemCode: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.stockItem.count({ where: itemWhere }),
  ])

  const boardIds = boards.map(b => b.id)
  const itemIds = items.map(i => i.id)

  const pricingItems = boardIds.length && itemIds.length
    ? await request.server.prisma.pricingBoardItem.findMany({
        where: { pricingBoardId: { in: boardIds }, stockItemId: { in: itemIds } },
        select: { pricingBoardId: true, stockItemId: true, price: true },
      })
    : []

  const priceMap = new Map<string, Record<string, number>>()
  for (const pi of pricingItems) {
    if (!priceMap.has(pi.stockItemId)) priceMap.set(pi.stockItemId, {})
    priceMap.get(pi.stockItemId)![pi.pricingBoardId] = Number(pi.price)
  }

  const data = items.map(item => ({
    stockItem: item,
    prices: priceMap.get(item.id) || {},
  }))

  return reply.send({ boards, ...paginatedResponse(data, total, page, limit) })
}

const matrixSaveSchema = z.object({
  changes: z.array(z.object({
    stockItemId: z.string().min(1),
    boardId: z.string().min(1),
    price: z.coerce.number().nullable(),
  })),
})

export async function saveMatrix(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = validate(matrixSaveSchema, request.body, reply)
  if (!data) return

  const { branchId, userId } = request.user

  await request.server.prisma.$transaction(async (tx) => {
    for (const change of data.changes) {
      const existing = await tx.pricingBoardItem.findUnique({
        where: { pricingBoardId_stockItemId: { pricingBoardId: change.boardId, stockItemId: change.stockItemId } },
      })
      const oldPrice = existing ? Number(existing.price) : null

      if (change.price === null || change.price === 0) {
        if (existing) await tx.pricingBoardItem.delete({ where: { id: existing.id } })
      } else {
        await tx.pricingBoardItem.upsert({
          where: { pricingBoardId_stockItemId: { pricingBoardId: change.boardId, stockItemId: change.stockItemId } },
          create: { pricingBoardId: change.boardId, stockItemId: change.stockItemId, price: change.price },
          update: { price: change.price },
        })
      }

      await tx.auditLog.create({
        data: {
          branchId,
          userId,
          action: 'UPDATE',
          entity: 'pricing-board',
          entityId: change.boardId,
          changes: { stockItemId: change.stockItemId, oldPrice, newPrice: change.price },
        },
      })
    }
  })

  return reply.send({ success: true, message: `${data.changes.length} price(s) updated` })
}

const batchCopySchema = z.object({
  sourceBoardId: z.string().min(1),
  targetBoardId: z.string().min(1),
  uomFilters: z.array(z.string()).optional(),
  adjustments: z.record(z.string(), z.coerce.number()).optional(),
})

export async function batchCopy(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = validate(batchCopySchema, request.body, reply)
  if (!data) return

  const { branchId, userId } = request.user

  const sourceItems = await request.server.prisma.pricingBoardItem.findMany({
    where: { pricingBoardId: data.sourceBoardId },
    include: { stockItem: { select: { id: true, uom: true } } },
  })

  let filtered = sourceItems
  if (data.uomFilters?.length) {
    filtered = sourceItems.filter(si => {
      const uom = si.stockItem.uom.toUpperCase()
      return data.uomFilters!.some(f => uom.includes(f.toUpperCase()))
    })
  }

  let count = 0
  await request.server.prisma.$transaction(async (tx) => {
    for (const item of filtered) {
      const uom = item.stockItem.uom.toUpperCase()
      const adj = data.adjustments?.[uom] ?? data.adjustments?.['KG'] ?? 0
      const newPrice = Number(item.price) + adj

      await tx.pricingBoardItem.upsert({
        where: { pricingBoardId_stockItemId: { pricingBoardId: data.targetBoardId, stockItemId: item.stockItemId } },
        create: { pricingBoardId: data.targetBoardId, stockItemId: item.stockItemId, price: Math.max(0, newPrice) },
        update: { price: Math.max(0, newPrice) },
      })

      await tx.auditLog.create({
        data: {
          branchId, userId,
          action: 'UPDATE',
          entity: 'pricing-board',
          entityId: data.targetBoardId,
          changes: { operation: 'batch-copy', sourceBoardId: data.sourceBoardId, stockItemId: item.stockItemId, price: newPrice },
        },
      })
      count++
    }
  })

  return reply.send({ success: true, message: `${count} price(s) copied` })
}

export async function getAuditTrail(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { date, search } = request.query as any
  const { page, limit, skip } = getPaginationParams(request.query)

  const targetDate = date ? new Date(date) : new Date()
  const startOfDay = new Date(targetDate)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = new Date(targetDate)
  endOfDay.setUTCHours(23, 59, 59, 999)

  const where: Prisma.AuditLogWhereInput = {
    branchId,
    entity: 'pricing-board',
    createdAt: { gte: startOfDay, lte: endOfDay },
    ...(search && {
      OR: [
        { changes: { path: [], string_contains: search } },
        { userEmail: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.auditLog.count({ where }),
  ])

  const userIds = [...new Set(data.filter(d => d.userId).map(d => d.userId!))]
  const users = userIds.length
    ? await request.server.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : []
  const userMap = new Map(users.map(u => [u.id, u.name]))

  const enriched = data.map(entry => ({
    ...entry,
    userName: entry.userId ? userMap.get(entry.userId) || 'Unknown' : 'System',
  }))

  return reply.send(paginatedResponse(enriched, total, page, limit))
}
