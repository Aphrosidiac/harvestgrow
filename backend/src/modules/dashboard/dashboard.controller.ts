import { FastifyRequest, FastifyReply } from 'fastify'

export async function getStats(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user
  const cacheKey = `dashboard:stats:${branchId}`

  // Check cache first (30s TTL — fresh enough for dashboard)
  const cached = await request.server.cache.get(cacheKey)
  if (cached) return reply.send({ success: true, data: cached })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const endOfToday = new Date(today); endOfToday.setHours(23, 59, 59, 999)
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 6)
  const last14Start = new Date(today); last14Start.setDate(last14Start.getDate() - 13)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)

  const [
    totalItems, totalCustomers,
    invoicesToday, invoicesMonth,
    outstandingInvoices, overdueInvoices,
    pendingQuotations, draftDocuments,
    docCounts,
    lowStockRaw,
    lowStockCount,
    todaysOrdersRaw,
    todaysDeliveryStops,
    topSellingRaw,
    dailySalesRaw,
    stockTurnoverRaw,
    productionBottlenecksRaw,
    recentPriceChangesRaw,
  ] = await Promise.all([
    request.server.prisma.stockItem.count({ where: { branchId, isActive: true } }),
    request.server.prisma.customer.count({ where: { branchId } }),
    request.server.prisma.document.findMany({
      where: { branchId, documentType: 'INVOICE', status: { notIn: ['VOID', 'CANCELLED', 'DRAFT'] }, issueDate: { gte: today } },
    }),
    request.server.prisma.document.findMany({
      where: { branchId, documentType: 'INVOICE', status: { notIn: ['VOID', 'CANCELLED', 'DRAFT'] }, issueDate: { gte: monthStart } },
    }),
    request.server.prisma.document.count({
      where: { branchId, documentType: 'INVOICE', status: { in: ['OUTSTANDING', 'PARTIAL'] } },
    }),
    request.server.prisma.document.count({
      where: { branchId, documentType: 'INVOICE', status: { in: ['OUTSTANDING', 'PARTIAL'] }, dueDate: { lt: today } },
    }),
    request.server.prisma.document.count({
      where: { branchId, documentType: 'QUOTATION', status: { in: ['PENDING', 'APPROVED', 'SENT'] } },
    }),
    request.server.prisma.document.count({
      where: { branchId, status: 'DRAFT' },
    }),
    // Count by document type
    request.server.prisma.document.groupBy({
      by: ['documentType'],
      where: { branchId, status: { notIn: ['VOID', 'CANCELLED'] } },
      _count: true,
    }),
    // Top 5 critical low-stock items
    request.server.prisma.$queryRaw<any[]>`
      SELECT si.id, si."itemCode", si.description, si.quantity, si."minStock", si.uom,
             sc.id as "category_id", sc.name as "category_name"
      FROM stock_items si
      LEFT JOIN stock_categories sc ON si."categoryId" = sc.id
      WHERE si."branchId" = ${branchId}
        AND si."isActive" = true
        AND si."minStock" > 0
        AND si.quantity <= si."minStock"
      ORDER BY (si.quantity::float / NULLIF(si."minStock", 0)) ASC, si.quantity ASC
      LIMIT 5
    `,
    request.server.prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int as c FROM stock_items
      WHERE "branchId" = ${branchId} AND "isActive" = true
        AND "minStock" > 0 AND quantity <= "minStock"
    `.then((rows) => rows[0]?.c ?? 0),
    // Today's orders (by deliveryDate)
    request.server.prisma.order.findMany({
      where: { deliveryDate: { gte: today, lte: endOfToday } },
      select: { id: true, status: true, total: true },
    }),
    // Today's delivery stops
    request.server.prisma.deliveryStop.findMany({
      where: { trip: { date: { gte: today, lte: endOfToday } } },
      select: { status: true },
    }),
    // Top selling last 7 days
    request.server.prisma.$queryRaw<Array<{ stockItemId: string; itemName: string; totalQty: number }>>`
      SELECT ol."stockItemId", ol."itemName", SUM(ol.quantity)::float as "totalQty"
      FROM order_lines ol
      INNER JOIN orders o ON ol."orderId" = o.id
      WHERE o."createdAt" >= ${weekStart}
        AND o.status != 'CANCELLED'
      GROUP BY ol."stockItemId", ol."itemName"
      ORDER BY "totalQty" DESC
      LIMIT 5
    `,
    // Daily sales last 14 days
    request.server.prisma.$queryRaw<Array<{ day: Date; total: number; count: number }>>`
      SELECT DATE_TRUNC('day', "createdAt") as day, SUM(total)::float as total, COUNT(*)::int as count
      FROM orders
      WHERE "createdAt" >= ${last14Start}
        AND status != 'CANCELLED'
      GROUP BY day
      ORDER BY day ASC
    `,
    // Stock turnover — last 7 days
    request.server.prisma.$queryRaw<Array<{ id: string; itemCode: string; description: string; quantity: number; uom: string; soldQty: number }>>`
      SELECT si.id, si."itemCode", si.description, si.quantity, si.uom,
             COALESCE(SUM(ol.quantity), 0)::float as "soldQty"
      FROM stock_items si
      LEFT JOIN order_lines ol ON ol."stockItemId" = si.id
      LEFT JOIN orders o ON ol."orderId" = o.id AND o."createdAt" >= ${weekStart} AND o.status != 'CANCELLED'
      WHERE si."branchId" = ${branchId} AND si."isActive" = true
      GROUP BY si.id
      HAVING COALESCE(SUM(ol.quantity), 0) > 0
      ORDER BY "soldQty" DESC
      LIMIT 10
    `,
    // Production bottleneck — orders in picking/cutting/packing more than 2h
    request.server.prisma.order.count({
      where: {
        status: { in: ['PICKING', 'CUTTING', 'PACKING'] },
        updatedAt: { lt: twoHoursAgo },
      },
    }),
    // Recent price changes
    request.server.prisma.priceHistory.findMany({
      where: { stockItem: { branchId } },
      include: {
        stockItem: { select: { itemCode: true, description: true } },
        changedBy: { select: { name: true } },
      },
      orderBy: { changedAt: 'desc' },
      take: 10,
    }),
  ])

  const revenueToday = invoicesToday.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0)
  const revenueThisMonth = invoicesMonth.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0)

  const documentBreakdown = Object.fromEntries(
    docCounts.map((d) => [d.documentType, d._count])
  )

  const lowStockItems = lowStockRaw.map((r: any) => {
    const { category_id, category_name, ...rest } = r
    return {
      ...rest,
      category: category_id ? { id: category_id, name: category_name } : null,
    }
  })

  // Today's orders aggregated
  const todaysOrdersTotal = todaysOrdersRaw.reduce((s, o) => s + Number(o.total), 0)
  const todaysOrdersByStatus: Record<string, number> = {}
  for (const o of todaysOrdersRaw) {
    todaysOrdersByStatus[o.status] = (todaysOrdersByStatus[o.status] ?? 0) + 1
  }

  const todaysDeliveries = {
    total: todaysDeliveryStops.length,
    delivered: todaysDeliveryStops.filter((s) => s.status === 'DELIVERED').length,
    inProgress: todaysDeliveryStops.filter((s) => s.status === 'ARRIVED').length,
    pending: todaysDeliveryStops.filter((s) => s.status === 'PENDING').length,
    failed: todaysDeliveryStops.filter((s) => s.status === 'FAILED').length,
  }

  const topSellingItems = topSellingRaw.map((r) => ({
    stockItemId: r.stockItemId,
    itemName: r.itemName,
    totalQty: Number(r.totalQty),
  }))

  // Fill in missing days in 14-day range
  const dailySalesMap = new Map<string, { total: number; count: number }>()
  for (const r of dailySalesRaw) {
    const key = new Date(r.day).toISOString().slice(0, 10)
    dailySalesMap.set(key, { total: Number(r.total), count: r.count })
  }
  const dailySales: Array<{ date: string; total: number; count: number }> = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const entry = dailySalesMap.get(key) ?? { total: 0, count: 0 }
    dailySales.push({ date: key, ...entry })
  }

  const stockTurnover = stockTurnoverRaw.map((r) => {
    const sold = Number(r.soldQty)
    const dailyRate = sold / 7
    const daysOfCover = dailyRate > 0 ? r.quantity / dailyRate : null
    return {
      id: r.id,
      itemCode: r.itemCode,
      description: r.description,
      quantity: r.quantity,
      uom: r.uom,
      soldQty: sold,
      daysOfCover: daysOfCover !== null ? Math.round(daysOfCover * 10) / 10 : null,
    }
  })

  const recentPriceChanges = recentPriceChangesRaw.map((p) => {
    const oldPrice = Number(p.oldPrice); const newPrice = Number(p.newPrice)
    const deltaPct = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0
    return {
      id: p.id,
      itemCode: p.stockItem.itemCode,
      description: p.stockItem.description,
      oldPrice,
      newPrice,
      deltaPct: Math.round(deltaPct * 10) / 10,
      changedAt: p.changedAt,
      changedBy: p.changedBy?.name ?? null,
    }
  })

  const data = {
    totalItems,
    totalCustomers,
    invoicesToday: invoicesToday.length,
    invoicesThisMonth: invoicesMonth.length,
    revenueToday,
    revenueThisMonth,
    outstandingInvoices,
    overdueInvoices,
    pendingQuotations,
    draftDocuments,
    documentBreakdown,
    lowStockItems,
    lowStockCount,
    todaysOrders: {
      count: todaysOrdersRaw.length,
      total: todaysOrdersTotal,
      byStatus: todaysOrdersByStatus,
    },
    todaysDeliveries,
    topSellingItems,
    dailySales,
    stockTurnover,
    productionBottlenecks: productionBottlenecksRaw,
    recentPriceChanges,
  }

  await request.server.cache.set(cacheKey, data, 30)
  return reply.send({ success: true, data })
}

export async function getRevenueChart(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user
  const cacheKey = `dashboard:revenue:${branchId}`

  const cached = await request.server.cache.get(cacheKey)
  if (cached) return reply.send({ success: true, data: cached })

  // Last 7 days revenue
  const days: { date: string; revenue: number; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)

    const invoices = await request.server.prisma.document.findMany({
      where: {
        branchId,
        documentType: 'INVOICE',
        status: { notIn: ['VOID', 'CANCELLED', 'DRAFT'] },
        issueDate: { gte: date, lt: nextDay },
      },
      select: { totalAmount: true },
    })

    days.push({
      date: date.toISOString().split('T')[0],
      revenue: invoices.reduce((sum, inv) => sum + inv.totalAmount.toNumber(), 0),
      count: invoices.length,
    })
  }

  await request.server.cache.set(cacheKey, days, 60)
  return reply.send({ success: true, data: days })
}

export async function getLowStock(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user
  const cacheKey = `dashboard:lowstock:${branchId}`

  const cached = await request.server.cache.get(cacheKey)
  if (cached) return reply.send({ success: true, data: cached })

  const items = await request.server.prisma.$queryRaw`
    SELECT si.*, sc.name as "categoryName"
    FROM stock_items si
    LEFT JOIN stock_categories sc ON si."categoryId" = sc.id
    WHERE si."branchId" = ${branchId}
    AND si."isActive" = true
    AND si.quantity <= si."minStock"
    ORDER BY si.quantity ASC
    LIMIT 20
  `

  await request.server.cache.set(cacheKey, items, 60)
  return reply.send({ success: true, data: items })
}

export async function getRecentInvoices(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user

  const documents = await request.server.prisma.document.findMany({
    where: { branchId, documentType: 'INVOICE' },
    include: { createdBy: { select: { name: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return reply.send({ success: true, data: documents })
}

export async function getActionItems(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [overdue, pendingQuotations, drafts] = await Promise.all([
    request.server.prisma.document.findMany({
      where: { branchId, documentType: 'INVOICE', status: { in: ['OUTSTANDING', 'PARTIAL'] }, dueDate: { lt: today } },
      select: { id: true, documentNumber: true, customerName: true, totalAmount: true, paidAmount: true, dueDate: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
    request.server.prisma.document.findMany({
      where: { branchId, documentType: 'QUOTATION', status: { in: ['PENDING', 'APPROVED', 'SENT'] } },
      select: { id: true, documentNumber: true, customerName: true, totalAmount: true, status: true, issueDate: true },
      orderBy: { issueDate: 'asc' },
      take: 10,
    }),
    request.server.prisma.document.findMany({
      where: { branchId, status: 'DRAFT' },
      select: { id: true, documentNumber: true, documentType: true, customerName: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return reply.send({ success: true, data: { overdue, pendingQuotations, drafts } })
}

export async function getRecentActivity(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user

  // Get recent stock history + recent documents + recent payments as a combined feed
  const [stockHistory, recentDocs, recentPayments] = await Promise.all([
    request.server.prisma.stockHistory.findMany({
      where: { branchId },
      include: { stockItem: { select: { itemCode: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    request.server.prisma.document.findMany({
      where: { branchId },
      select: { id: true, documentNumber: true, documentType: true, status: true, customerName: true, totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    request.server.prisma.payment.findMany({
      where: { document: { branchId } },
      include: { document: { select: { documentNumber: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  // Merge and sort by date
  const activities = [
    ...stockHistory.map((h) => ({
      type: 'stock' as const,
      description: `${h.type === 'IN' ? '+' : '-'}${h.quantity} ${h.stockItem.itemCode} — ${h.reason}`,
      by: h.createdBy.name,
      date: h.createdAt,
    })),
    ...recentDocs.map((d) => ({
      type: 'document' as const,
      description: `${d.documentNumber} ${d.status}${d.customerName ? ` — ${d.customerName}` : ''}`,
      by: '',
      date: d.createdAt,
      link: `/app/documents/${d.id}`,
    })),
    ...recentPayments.map((p) => ({
      type: 'payment' as const,
      description: `RM ${p.amount.toNumber().toFixed(2)} received for ${p.document.documentNumber}`,
      by: p.createdBy.name,
      date: p.createdAt,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

  return reply.send({ success: true, data: activities })
}
