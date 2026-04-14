import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'
import { recordStockHistory } from './stock.history.js'

const ALLOWED_SORT_FIELDS = ['itemCode', 'description', 'costPrice', 'sellPrice', 'quantity', 'updatedAt', 'createdAt']

export async function listStock(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, categoryId, sortBy, order } = request.query as any

  const where: Prisma.StockItemWhereInput = {
    branchId,
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const validSort = sortBy && ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'updatedAt'
  const orderBy: Prisma.StockItemOrderByWithRelationInput = {
    [validSort]: order === 'desc' ? 'desc' : (sortBy ? 'asc' : 'desc'),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.stockItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    request.server.prisma.stockItem.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getStock(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const item = await request.server.prisma.stockItem.findFirst({
    where: { id: request.params.id, branchId },
    include: { category: true },
  })

  if (!item) {
    return reply.status(404).send({ success: false, message: 'Item not found' })
  }

  return reply.send({ success: true, data: item })
}

export async function createStock(
  request: FastifyRequest<{
    Body: {
      itemCode: string
      description: string
      uom?: string
      costPrice: number
      sellPrice: number
      quantity?: number
      minStock?: number
      categoryId?: string
      imageUrl?: string
      isPerishable?: boolean
      shelfLifeDays?: number
      cutOptions?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { itemCode, description, uom, costPrice, sellPrice, quantity, minStock, categoryId, imageUrl, isPerishable, shelfLifeDays, cutOptions } = request.body

  if (!itemCode || !description) {
    return reply.status(400).send({ success: false, message: 'Item code and description are required' })
  }

  if (costPrice < 0 || sellPrice < 0) {
    return reply.status(400).send({ success: false, message: 'Prices must be non-negative' })
  }

  const initialQty = Math.max(0, quantity || 0)

  const item = await request.server.prisma.stockItem.create({
    data: {
      branchId,
      itemCode,
      description,
      uom: uom || 'PCS',
      costPrice,
      sellPrice,
      quantity: initialQty,
      minStock: minStock !== undefined ? Math.max(0, minStock) : 5,
      categoryId,
      imageUrl: imageUrl?.trim() || null,
      isPerishable: isPerishable !== undefined ? isPerishable : true,
      shelfLifeDays: shelfLifeDays ?? null,
      cutOptions: cutOptions?.trim() || null,
    },
    include: { category: true },
  })

  // Record history
  if (initialQty > 0) {
    await recordStockHistory({
      prisma: request.server.prisma,
      branchId,
      stockItemId: item.id,
      type: 'IN',
      quantity: initialQty,
      previousQty: 0,
      newQty: initialQty,
      reason: 'Initial stock',
      createdById: userId,
    })
  }

  return reply.status(201).send({ success: true, data: item })
}

export async function updateStock(
  request: FastifyRequest<{ Params: { id: string }; Body: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params
  const { itemCode, description, uom, costPrice, sellPrice, quantity, minStock, categoryId, imageUrl, isPerishable, shelfLifeDays, cutOptions } = request.body

  const existing = await request.server.prisma.stockItem.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Item not found' })
  }

  if (costPrice !== undefined && costPrice < 0) {
    return reply.status(400).send({ success: false, message: 'Cost price must be non-negative' })
  }
  if (sellPrice !== undefined && sellPrice < 0) {
    return reply.status(400).send({ success: false, message: 'Sell price must be non-negative' })
  }

  const newQty = quantity !== undefined ? Math.max(0, quantity) : undefined

  // Snapshot previous price if sellPrice is changing
  const priceChanging = sellPrice !== undefined && Number(sellPrice) !== Number(existing.sellPrice)

  const item = await request.server.prisma.$transaction(async (tx) => {
    const updated = await tx.stockItem.update({
      where: { id },
      data: {
        ...(itemCode && { itemCode }),
        ...(description && { description }),
        ...(uom && { uom }),
        ...(costPrice !== undefined && { costPrice }),
        ...(sellPrice !== undefined && { sellPrice }),
        ...(priceChanging && { previousPrice: existing.sellPrice, priceUpdatedAt: new Date() }),
        ...(newQty !== undefined && { quantity: newQty }),
        ...(minStock !== undefined && { minStock: Math.max(0, minStock) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
        ...(isPerishable !== undefined && { isPerishable }),
        ...(shelfLifeDays !== undefined && { shelfLifeDays: shelfLifeDays ?? null }),
        ...(cutOptions !== undefined && { cutOptions: cutOptions?.trim() || null }),
      },
      include: { category: true },
    })
    if (priceChanging) {
      await tx.priceHistory.create({
        data: {
          stockItemId: id,
          oldPrice: existing.sellPrice,
          newPrice: sellPrice as number,
          changedById: userId,
        },
      })
    }
    return updated
  })

  // Record history if quantity changed
  if (newQty !== undefined && newQty !== existing.quantity) {
    const diff = newQty - existing.quantity
    await recordStockHistory({
      prisma: request.server.prisma,
      branchId,
      stockItemId: id,
      type: diff > 0 ? 'IN' : 'OUT',
      quantity: Math.abs(diff),
      previousQty: existing.quantity,
      newQty,
      reason: 'Manual adjustment',
      createdById: userId,
    })
  }

  return reply.send({ success: true, data: item })
}

export async function deleteStock(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.stockItem.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Item not found' })
  }

  await request.server.prisma.stockItem.update({
    where: { id },
    data: { isActive: false },
  })

  return reply.send({ success: true, message: 'Item deleted' })
}

// ─── STOCK ADJUST ──────────────────────────────────────────
export async function adjustStock(
  request: FastifyRequest<{
    Params: { id: string }
    Body: { type: 'add' | 'remove'; quantity: number; reason: string }
  }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params
  const { type, quantity, reason } = request.body

  if (!quantity || quantity <= 0) {
    return reply.status(400).send({ success: false, message: 'Quantity must be positive' })
  }
  if (!reason?.trim()) {
    return reply.status(400).send({ success: false, message: 'Reason is required' })
  }

  const existing = await request.server.prisma.stockItem.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Item not found' })
  }

  if (type === 'remove' && existing.quantity < quantity) {
    return reply.status(400).send({ success: false, message: `Insufficient stock: have ${existing.quantity}, trying to remove ${quantity}` })
  }

  const newQty = type === 'add' ? existing.quantity + quantity : existing.quantity - quantity

  const item = await request.server.prisma.stockItem.update({
    where: { id },
    data: { quantity: newQty },
    include: { category: true },
  })

  await recordStockHistory({
    prisma: request.server.prisma,
    branchId,
    stockItemId: id,
    type: type === 'add' ? 'IN' : 'OUT',
    quantity,
    previousQty: existing.quantity,
    newQty,
    reason: reason.trim(),
    createdById: userId,
  })

  return reply.send({ success: true, data: item })
}

// ─── STOCK HISTORY ─────────────────────────────────────────
export async function getStockHistory(
  request: FastifyRequest<{ Params: { id: string }; Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { page, limit, skip } = getPaginationParams(request.query)
  const { type, from, to } = request.query as any

  const where: Prisma.StockHistoryWhereInput = {
    stockItemId: id,
    branchId,
    ...(type && { type }),
    ...(from || to ? {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + 'T23:59:59') }),
      },
    } : {}),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.stockHistory.findMany({
      where,
      include: { createdBy: { select: { name: true } }, document: { select: { documentNumber: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.stockHistory.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

// ─── BULK PRICE UPDATE ─────────────────────────────────────
export async function bulkPriceUpdate(
  request: FastifyRequest<{
    Body: { updates: Array<{ id: string; sellPrice: number }>; note?: string }
  }>,
  reply: FastifyReply
) {
  const { branchId, userId, role } = request.user
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return reply.status(403).send({ success: false, message: 'Insufficient permissions' })
  }

  const { updates, note } = request.body
  if (!Array.isArray(updates) || updates.length === 0) {
    return reply.status(400).send({ success: false, message: 'No updates provided' })
  }

  const result = await request.server.prisma.$transaction(async (tx) => {
    let updated = 0
    let skipped = 0
    const items: Array<{ id: string; oldPrice: number; newPrice: number }> = []
    const now = new Date()

    for (const u of updates) {
      if (!u?.id || typeof u.sellPrice !== 'number' || u.sellPrice < 0) {
        skipped++
        continue
      }
      const existing = await tx.stockItem.findFirst({ where: { id: u.id, branchId } })
      if (!existing) {
        skipped++
        continue
      }
      const oldPrice = Number(existing.sellPrice)
      const newPrice = Number(u.sellPrice)
      if (oldPrice === newPrice) {
        skipped++
        continue
      }

      await tx.stockItem.update({
        where: { id: u.id },
        data: {
          sellPrice: newPrice,
          previousPrice: existing.sellPrice,
          priceUpdatedAt: now,
        },
      })
      await tx.priceHistory.create({
        data: {
          stockItemId: u.id,
          oldPrice: existing.sellPrice,
          newPrice,
          changedById: userId,
          note: note || null,
        },
      })
      updated++
      items.push({ id: u.id, oldPrice, newPrice })
    }

    return { updated, skipped, items }
  })

  // Explicit audit log (route not standard CRUD)
  try {
    await request.server.prisma.auditLog.create({
      data: {
        branchId,
        userId,
        action: 'STOCK_BULK_PRICE_UPDATE',
        entity: 'stock',
        method: request.method,
        path: request.url,
        statusCode: 200,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
        changes: { count: result.updated, skipped: result.skipped, note: note || null },
      },
    })
  } catch (err) {
    request.log.error({ err }, 'bulk price audit log failed')
  }

  return reply.send({ success: true, ...result })
}

// ─── PRICE HISTORY ─────────────────────────────────────────
export async function getPriceHistory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const item = await request.server.prisma.stockItem.findFirst({ where: { id, branchId } })
  if (!item) return reply.status(404).send({ success: false, message: 'Item not found' })

  const history = await request.server.prisma.priceHistory.findMany({
    where: { stockItemId: id },
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { changedAt: 'desc' },
    take: 50,
  })

  return reply.send({ success: true, data: history })
}

// ─── LOW STOCK ─────────────────────────────────────────────
export async function getLowStockItems(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const items = await request.server.prisma.$queryRaw<any[]>`
    SELECT si.*,
           sc.id as "category_id", sc.name as "category_name", sc.code as "category_code"
    FROM stock_items si
    LEFT JOIN stock_categories sc ON si."categoryId" = sc.id
    WHERE si."branchId" = ${branchId}
      AND si."isActive" = true
      AND si."minStock" > 0
      AND si.quantity <= si."minStock"
    ORDER BY (si.quantity::float / NULLIF(si."minStock", 0)) ASC, si.quantity ASC
  `

  const data = items.map((r: any) => {
    const { category_id, category_name, category_code, ...rest } = r
    return {
      ...rest,
      category: category_id ? { id: category_id, name: category_name, code: category_code } : null,
    }
  })

  return reply.send({ success: true, data })
}

export async function getAllStockHistory(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { type, from, to, search } = request.query as any

  const where: Prisma.StockHistoryWhereInput = {
    branchId,
    ...(type && { type }),
    ...(search && {
      stockItem: {
        OR: [
          { itemCode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
    }),
    ...(from || to ? {
      createdAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + 'T23:59:59') }),
      },
    } : {}),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.stockHistory.findMany({
      where,
      include: {
        stockItem: { select: { itemCode: true, description: true } },
        createdBy: { select: { name: true } },
        document: { select: { documentNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.stockHistory.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}
