import { FastifyRequest, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'

export async function getDailyPaymentLog(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { from, to, method, search } = request.query as any

  // Default to today if no date range
  const dateFrom = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0))
  const dateTo = to ? new Date(to + 'T23:59:59.999') : new Date(new Date().setHours(23, 59, 59, 999))

  const where: Prisma.PaymentWhereInput = {
    createdAt: { gte: dateFrom, lte: dateTo },
    document: {
      branchId,
      ...(search && {
        OR: [
          { documentNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { vehiclePlate: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    ...(method && { paymentMethod: method }),
  }

  const [payments, total] = await Promise.all([
    request.server.prisma.payment.findMany({
      where,
      include: {
        document: {
          select: {
            documentNumber: true,
            customerName: true,
            vehiclePlate: true,
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.payment.count({ where }),
  ])

  const allPayments = await request.server.prisma.payment.findMany({
    where,
    select: { amount: true, paymentMethod: true },
  })

  const byMethod: Record<string, { total: number; count: number }> = {}
  let grandTotal = 0

  for (const p of allPayments) {
    const m = p.paymentMethod
    if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 }
    const amount = p.amount.toNumber()
    byMethod[m].total = Math.round((byMethod[m].total + amount) * 100) / 100
    byMethod[m].count++
    grandTotal = Math.round((grandTotal + amount) * 100) / 100
  }

  const data = payments.map((p) => ({
    id: p.id,
    amount: p.amount.toNumber(),
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber,
    bankName: p.bankName,
    notes: p.notes,
    documentNumber: p.document.documentNumber,
    customerName: p.document.customerName,
    vehiclePlate: p.document.vehiclePlate,
    createdBy: p.createdBy?.name,
    createdAt: p.createdAt,
  }))

  return reply.send({
    ...paginatedResponse(data, total, page, limit),
    summary: {
      grandTotal,
      totalPayments: allPayments.length,
      byMethod,
      dateFrom: dateFrom.toISOString().split('T')[0],
      dateTo: dateTo.toISOString().split('T')[0],
    },
  })
}

// ─── Helpers ─────────────────────────────────────────────────
function parseRange(q: any): { from: Date; to: Date } {
  const from = q.from ? new Date(q.from) : new Date(new Date().setHours(0, 0, 0, 0) - 30 * 24 * 3600 * 1000)
  const to = q.to ? new Date(q.to + 'T23:59:59.999') : new Date(new Date().setHours(23, 59, 59, 999))
  return { from, to }
}

// ─── Sales Report ────────────────────────────────────────────
export async function getSalesReport(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to } = parseRange(request.query)
  const { categoryId, paymentStatus } = request.query as any

  const where: Prisma.OrderWhereInput = {
    createdAt: { gte: from, lte: to },
    status: { not: 'CANCELLED' },
    ...(paymentStatus && { paymentStatus }),
    ...(categoryId && { lines: { some: { stockItem: { categoryId } } } }),
  }

  const orders = await request.server.prisma.order.findMany({
    where,
    include: {
      lines: { select: { quantity: true, lineTotal: true } },
      invoice: { select: { paidAmount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: o.createdAt,
    customerName: o.contactName,
    contactPhone: o.contactPhone,
    itemsCount: o.lines.length,
    subtotal: Number(o.subtotal),
    total: Number(o.total),
    paidAmount: o.invoice ? Number(o.invoice.paidAmount) : 0,
    paymentStatus: o.paymentStatus,
    status: o.status,
  }))

  const totals = rows.reduce(
    (acc, r) => {
      acc.subtotal += r.subtotal
      acc.total += r.total
      acc.paid += r.paidAmount
      return acc
    },
    { subtotal: 0, total: 0, paid: 0 }
  )
  void branchId

  return reply.send({
    success: true,
    data: rows,
    totals: {
      count: rows.length,
      subtotal: Math.round(totals.subtotal * 100) / 100,
      total: Math.round(totals.total * 100) / 100,
      paid: Math.round(totals.paid * 100) / 100,
    },
  })
}

// ─── Orders Report ───────────────────────────────────────────
export async function getOrdersReport(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { from, to } = parseRange(request.query)
  const { status, slot, driverId } = request.query as any

  const where: Prisma.OrderWhereInput = {
    deliveryDate: { gte: from, lte: to },
    ...(status && { status }),
    ...(slot && { deliverySlot: slot }),
    ...(driverId && { deliveryStop: { trip: { driverId } } }),
  }

  const orders = await request.server.prisma.order.findMany({
    where,
    include: {
      deliveryStop: {
        include: {
          trip: {
            include: { driver: { include: { user: { select: { name: true } } } } },
          },
        },
      },
    },
    orderBy: { deliveryDate: 'desc' },
    take: 5000,
  })

  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    customerName: o.contactName,
    contactPhone: o.contactPhone,
    deliveryDate: o.deliveryDate,
    slot: o.deliverySlot,
    status: o.status,
    paymentStatus: o.paymentStatus,
    total: Number(o.total),
    driverName: o.deliveryStop?.trip.driver.user.name ?? null,
  }))

  return reply.send({ success: true, data: rows, totals: { count: rows.length, total: rows.reduce((s, r) => s + r.total, 0) } })
}

// ─── Stock Movement ──────────────────────────────────────────
export async function getStockMovementReport(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to } = parseRange(request.query)
  const { stockItemId } = request.query as any

  if (!stockItemId) {
    return reply.status(400).send({ success: false, message: 'stockItemId is required' })
  }

  const item = await request.server.prisma.stockItem.findFirst({
    where: { id: stockItemId, branchId },
    select: { id: true, itemCode: true, description: true, uom: true, quantity: true },
  })
  if (!item) return reply.status(404).send({ success: false, message: 'Stock item not found' })

  // Purchases (IN)
  const purchases = await request.server.prisma.purchaseInvoiceItem.findMany({
    where: {
      stockItemId,
      purchaseInvoice: { branchId, issueDate: { gte: from, lte: to } },
    },
    include: {
      purchaseInvoice: { select: { internalNumber: true, issueDate: true, supplier: { select: { companyName: true } } } },
    },
  })

  // Orders (OUT)
  const orderLines = await request.server.prisma.orderLine.findMany({
    where: {
      stockItemId,
      order: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELLED' } },
    },
    include: {
      order: { select: { orderNumber: true, createdAt: true, contactName: true } },
    },
  })

  type Movement = {
    date: Date
    type: 'IN' | 'OUT'
    qty: number
    reference: string
    partyName: string
  }
  const movements: Movement[] = []
  for (const p of purchases) {
    movements.push({
      date: p.purchaseInvoice.issueDate,
      type: 'IN',
      qty: Number(p.quantity),
      reference: p.purchaseInvoice.internalNumber,
      partyName: p.purchaseInvoice.supplier.companyName,
    })
  }
  for (const ol of orderLines) {
    movements.push({
      date: ol.order.createdAt,
      type: 'OUT',
      qty: Number(ol.quantity),
      reference: ol.order.orderNumber,
      partyName: ol.order.contactName,
    })
  }
  movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Running balance — start at current - total movements within range (approximation)
  const totalIn = movements.filter((m) => m.type === 'IN').reduce((s, m) => s + m.qty, 0)
  const totalOut = movements.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.qty, 0)
  let running = item.quantity - totalIn + totalOut
  const rows = movements.map((m) => {
    running += m.type === 'IN' ? m.qty : -m.qty
    return { ...m, balance: Math.round(running * 1000) / 1000 }
  })

  return reply.send({
    success: true,
    data: rows,
    item,
    totals: { in: totalIn, out: totalOut, net: totalIn - totalOut, currentStock: item.quantity },
  })
}

// ─── Price History Report ────────────────────────────────────
export async function getPriceHistoryReport(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to } = parseRange(request.query)
  const { stockItemId } = request.query as any

  const rows = await request.server.prisma.priceHistory.findMany({
    where: {
      changedAt: { gte: from, lte: to },
      stockItem: { branchId },
      ...(stockItemId && { stockItemId }),
    },
    include: {
      stockItem: { select: { itemCode: true, description: true, uom: true } },
      changedBy: { select: { name: true } },
    },
    orderBy: { changedAt: 'desc' },
    take: 2000,
  })

  const data = rows.map((p) => {
    const oldPrice = Number(p.oldPrice); const newPrice = Number(p.newPrice)
    const delta = newPrice - oldPrice
    const deltaPct = oldPrice > 0 ? (delta / oldPrice) * 100 : 0
    return {
      id: p.id,
      changedAt: p.changedAt,
      itemCode: p.stockItem.itemCode,
      description: p.stockItem.description,
      uom: p.stockItem.uom,
      oldPrice,
      newPrice,
      delta: Math.round(delta * 100) / 100,
      deltaPct: Math.round(deltaPct * 10) / 10,
      note: p.note,
      changedBy: p.changedBy?.name ?? null,
    }
  })

  return reply.send({ success: true, data, totals: { count: data.length } })
}

// ─── Driver Performance ──────────────────────────────────────
export async function getDriverPerformanceReport(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { from, to } = parseRange(request.query)

  const drivers = await request.server.prisma.driver.findMany({
    where: { active: true },
    include: {
      user: { select: { name: true, email: true } },
      trips: {
        where: { date: { gte: from, lte: to } },
        include: { stops: true },
      },
    },
  })

  const rows = drivers.map((d) => {
    let totalStops = 0, delivered = 0, failed = 0, totalDurationMs = 0, completedStops = 0
    for (const trip of d.trips) {
      for (const stop of trip.stops) {
        totalStops++
        if (stop.status === 'DELIVERED') {
          delivered++
          if (stop.arrivedAt && stop.deliveredAt) {
            totalDurationMs += new Date(stop.deliveredAt).getTime() - new Date(stop.arrivedAt).getTime()
            completedStops++
          }
        }
        if (stop.status === 'FAILED') failed++
      }
    }
    const successRate = totalStops > 0 ? (delivered / totalStops) * 100 : 0
    const avgDeliveryMinutes = completedStops > 0 ? (totalDurationMs / completedStops) / 60000 : 0
    return {
      driverId: d.id,
      driverName: d.user.name,
      vehiclePlate: d.vehiclePlate,
      trips: d.trips.length,
      totalStops,
      delivered,
      failed,
      successRate: Math.round(successRate * 10) / 10,
      avgDeliveryMinutes: Math.round(avgDeliveryMinutes * 10) / 10,
    }
  })

  return reply.send({ success: true, data: rows })
}

// ─── NEW REPORT ENDPOINTS ─────────────────────────────────

export async function getExportImportReport(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { date } = request.query as any
  const targetDate = date || new Date().toISOString().slice(0, 10)

  const trucks = await request.server.prisma.truck.findMany({
    where: { branchId },
    orderBy: { code: 'asc' },
  })

  const salesOrders = await request.server.prisma.salesOrder.findMany({
    where: {
      branchId,
      deliveryDate: {
        gte: new Date(targetDate),
        lte: new Date(targetDate + 'T23:59:59.999Z'),
      },
    },
    include: { items: true },
  })

  const data = trucks.map((t) => {
    const truckOrders = salesOrders.filter((o) => o.truck === t.code)
    const totalWeight = truckOrders.reduce((sum, o) =>
      sum + o.items.reduce((s, i) => s + Number(i.quantity), 0), 0)
    return {
      id: t.id,
      code: t.code,
      description: t.description,
      totalOrders: truckOrders.length,
      totalWeight: Math.round(totalWeight * 1000) / 1000,
    }
  })

  return reply.send({ success: true, data })
}

export async function getWastageSummary(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to, search } = request.query as any

  if (!from || !to) {
    return reply.send({ success: true, data: [] })
  }

  const where: Prisma.StockHistoryWhereInput = {
    branchId,
    type: 'OUT',
    reason: { contains: 'wastage', mode: 'insensitive' },
    createdAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') },
    ...(search && {
      stockItem: {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { itemCode: { contains: search, mode: 'insensitive' } },
        ],
      },
    }),
  }

  const data = await request.server.prisma.stockHistory.findMany({
    where,
    include: { stockItem: { select: { itemCode: true, description: true, uom: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return reply.send({ success: true, data })
}

export async function getSupplyReturnSummary(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to, search } = request.query as any

  if (!from || !to) {
    return reply.send({ success: true, data: [] })
  }

  const where: Prisma.StockHistoryWhereInput = {
    branchId,
    type: 'IN',
    reason: { contains: 'return', mode: 'insensitive' },
    createdAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') },
    ...(search && {
      stockItem: {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { itemCode: { contains: search, mode: 'insensitive' } },
        ],
      },
    }),
  }

  const data = await request.server.prisma.stockHistory.findMany({
    where,
    include: { stockItem: { select: { itemCode: true, description: true, uom: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return reply.send({ success: true, data })
}

export async function getSupplierSummary(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to, search } = request.query as any

  if (!from || !to) {
    return reply.send({ success: true, data: [] })
  }

  const where: Prisma.PurchaseInvoiceWhereInput = {
    branchId,
    issueDate: { gte: new Date(from), lte: new Date(to + 'T23:59:59.999Z') },
    ...(search && {
      supplier: {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      },
    }),
  }

  const invoices = await request.server.prisma.purchaseInvoice.findMany({
    where,
    include: { supplier: { select: { id: true, companyName: true, code: true } } },
    orderBy: { issueDate: 'desc' },
  })

  const grouped = new Map<string, { supplier: any; totalAmount: number; invoiceCount: number }>()
  for (const inv of invoices) {
    const key = inv.supplierId
    const entry = grouped.get(key) || { supplier: inv.supplier, totalAmount: 0, invoiceCount: 0 }
    entry.totalAmount += Number(inv.totalAmount)
    entry.invoiceCount++
    grouped.set(key, entry)
  }

  return reply.send({ success: true, data: [...grouped.values()] })
}

export async function getLowMarginSummary(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to, search, threshold } = request.query as any

  if (!from || !to) {
    return reply.send({ success: true, data: [], threshold: 30 })
  }

  const marginThreshold = parseInt(threshold) || 30

  const items = await request.server.prisma.stockItem.findMany({
    where: {
      branchId,
      isActive: true,
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { itemCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: { id: true, itemCode: true, description: true, uom: true, costPrice: true, sellPrice: true, quantity: true },
  })

  const alerts = items
    .filter((item) => {
      const cost = Number(item.costPrice)
      const sell = Number(item.sellPrice)
      if (sell === 0) return false
      const margin = ((sell - cost) / sell) * 100
      return margin < marginThreshold
    })
    .map((item) => ({
      itemCode: item.itemCode,
      description: item.description,
      uom: item.uom,
      balance: item.quantity,
      costPrice: Number(item.costPrice),
      sellPrice: Number(item.sellPrice),
      margin: Math.round(((Number(item.sellPrice) - Number(item.costPrice)) / Number(item.sellPrice)) * 1000) / 10,
    }))

  return reply.send({ success: true, data: alerts, threshold: marginThreshold })
}

export async function getTruckMapReport(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { date, truckId } = request.query as any

  if (!date) {
    return reply.send({ success: true, data: [], total: 0 })
  }

  const where: Prisma.TruckCustomerAssignmentWhereInput = {
    truck: { branchId },
    ...(truckId && { truckId }),
  }

  const assignments = await request.server.prisma.truckCustomerAssignment.findMany({
    where,
    include: {
      truck: { select: { code: true, description: true } },
      customer: { select: { name: true, companyName: true, companyCode: true, branchCode: true, branchLocation: true, country: true, phone: true } },
    },
    orderBy: [{ truck: { code: 'asc' } }, { level: 'asc' }],
  })

  const data = assignments.map((a) => ({
    level: a.level,
    shortCode: a.customer.branchCode || '',
    state: a.customer.country || '',
    city: a.customer.branchLocation || '',
    customerCode: a.customer.companyCode || '',
    companyName: a.customer.companyName || a.customer.name,
    truck: a.truck.code,
    contact: a.customer.phone || '',
  }))

  return reply.send({ success: true, data, total: data.length })
}
