import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { validate } from '../../utils/validation.js'
import { Prisma, ClearanceStatus } from '@prisma/client'

// ─── SETTINGS ──────────────────────────────────────────────

export async function getClearanceSettings(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const items = await request.server.prisma.stockItem.findMany({
    where: { branchId, isActive: true },
    select: { id: true, itemCode: true, description: true, imageUrl: true, showInClearance: true },
    orderBy: { itemCode: 'asc' },
  })
  return reply.send({ success: true, data: items })
}

const settingsSchema = z.object({
  items: z.array(z.object({
    stockItemId: z.string().min(1),
    showInClearance: z.boolean(),
  })),
})

export async function updateClearanceSettings(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = validate(settingsSchema, request.body, reply)
  if (!data) return

  const { branchId } = request.user

  await request.server.prisma.$transaction(
    data.items.map((item) =>
      request.server.prisma.stockItem.updateMany({
        where: { id: item.stockItemId, branchId },
        data: { showInClearance: item.showInClearance },
      })
    )
  )

  return reply.send({ success: true, message: 'Settings updated' })
}

// ─── LIST ──────────────────────────────────────────────────

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

// ─── GET SINGLE ────────────────────────────────────────────

export async function getClearanceList(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const list = await request.server.prisma.productClearanceList.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      items: {
        orderBy: [{ sortOrder: 'asc' }, { stockItem: { itemCode: 'asc' } }],
        include: {
          stockItem: { select: { id: true, itemCode: true, description: true, imageUrl: true, uom: true, sellPrice: true, costPrice: true, quantity: true } },
          inSupplier: { select: { id: true, companyName: true, shortForm: true } },
          supplyReturnSupplier: { select: { id: true, companyName: true, shortForm: true } },
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

// ─── CREATE ────────────────────────────────────────────────

export async function createClearanceList(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { date, autoPopulate } = request.body as any

  if (!date) {
    return reply.status(400).send({ success: false, message: 'Date is required' })
  }

  const targetDate = new Date(date)
  targetDate.setUTCHours(0, 0, 0, 0)

  const existing = await request.server.prisma.productClearanceList.findUnique({
    where: { branchId_date: { branchId, date: targetDate } },
  })
  if (existing) {
    return reply.status(400).send({ success: false, message: 'A clearance list for this date already exists' })
  }

  let itemCreates: any[] = []

  if (autoPopulate !== false) {
    const clearanceItems = await request.server.prisma.stockItem.findMany({
      where: { branchId, isActive: true, showInClearance: true },
      select: { id: true, costPrice: true },
      orderBy: { itemCode: 'asc' },
    })

    // Yesterday balance carry-forward
    const previousList = await request.server.prisma.productClearanceList.findFirst({
      where: { branchId, date: { lt: targetDate }, status: 'CLOSED' },
      orderBy: { date: 'desc' },
      include: { items: { select: { stockItemId: true, actualBalance: true } } },
    })

    const balanceMap = new Map<string, number>()
    if (previousList) {
      previousList.items.forEach((item) => {
        balanceMap.set(item.stockItemId, Number(item.actualBalance))
      })
    }

    itemCreates = clearanceItems.map((item, idx) => ({
      stockItemId: item.id,
      sortOrder: idx,
      cost: Number(item.costPrice),
      yesterdayBalance: balanceMap.get(item.id) ?? 0,
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

// ─── BULK SAVE ITEMS ───────────────────────────────────────

const bulkItemsSchema = z.object({
  items: z.array(z.object({
    stockItemId: z.string().min(1),
    sortOrder: z.coerce.number().int().default(0),
    inSupplierId: z.string().nullable().optional(),
    inQty: z.coerce.number().default(0),
    cost: z.coerce.number().default(0),
    yesterdayBalance: z.coerce.number().default(0),
    outPacking: z.coerce.number().default(0),
    outLoose: z.coerce.number().default(0),
    returnIn: z.coerce.number().default(0),
    actualBalance: z.coerce.number().default(0),
    wastage: z.coerce.number().default(0),
    supplyReturnSupplierId: z.string().nullable().optional(),
    supplyReturnQty: z.coerce.number().default(0),
  })),
})

export async function bulkSaveClearanceItems(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const data = validate(bulkItemsSchema, request.body, reply)
  if (!data) return

  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.productClearanceList.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Clearance list not found' })
  }
  if (existing.status !== 'OPEN') {
    return reply.status(400).send({ success: false, message: 'Cannot edit a closed clearance list' })
  }

  const calculatedItems = data.items.map((item) => {
    const yb = Number(item.yesterdayBalance)
    const inQ = Number(item.inQty)
    const outP = Number(item.outPacking)
    const outL = Number(item.outLoose)
    const retIn = Number(item.returnIn)
    const actBal = Number(item.actualBalance)
    const estBal = yb + inQ - outP - outL + retIn
    const lost = estBal - actBal

    return {
      stockItemId: item.stockItemId,
      sortOrder: item.sortOrder,
      inSupplierId: item.inSupplierId || null,
      inQty: inQ,
      cost: Number(item.cost),
      yesterdayBalance: yb,
      outPacking: outP,
      outLoose: outL,
      returnIn: retIn,
      estimatedBalance: estBal,
      actualBalance: actBal,
      lost,
      wastage: Number(item.wastage),
      supplyReturnSupplierId: item.supplyReturnSupplierId || null,
      supplyReturnQty: Number(item.supplyReturnQty),
    }
  })

  await request.server.prisma.$transaction(async (tx) => {
    await tx.productClearanceItem.deleteMany({ where: { clearanceListId: id } })
    await tx.productClearanceItem.createMany({
      data: calculatedItems.map((item) => ({ ...item, clearanceListId: id })),
    })
  })

  return reply.send({ success: true, message: 'Items saved' })
}

// ─── STATUS ────────────────────────────────────────────────

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

// ─── DELETE ────────────────────────────────────────────────

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
