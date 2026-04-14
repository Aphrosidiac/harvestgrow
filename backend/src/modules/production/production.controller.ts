import { FastifyRequest, FastifyReply } from 'fastify'
import { OrderStatus, Role } from '@prisma/client'
import { applyStatusTransition } from '../orders/orders.controller.js'

function dayRange(dateStr?: string) {
  const base = dateStr ? new Date(dateStr + 'T00:00:00.000Z') : new Date()
  if (!dateStr) base.setUTCHours(0, 0, 0, 0)
  const end = new Date(base)
  end.setUTCHours(23, 59, 59, 999)
  return { start: base, end }
}

const BOARD_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PICKING', 'CUTTING', 'PACKING', 'READY', 'OUT_FOR_DELIVERY',
]

export async function getBoard(
  request: FastifyRequest<{ Querystring: { date?: string; includeCompleted?: string } }>,
  reply: FastifyReply
) {
  const { date, includeCompleted } = request.query || {}
  const { start, end } = dayRange(date)
  const statuses: OrderStatus[] = includeCompleted === '1'
    ? [...BOARD_STATUSES, 'DELIVERED', 'CANCELLED']
    : BOARD_STATUSES

  const orders = await request.server.prisma.order.findMany({
    where: {
      deliveryDate: { gte: start, lte: end },
      status: { in: statuses },
    },
    include: {
      lines: { include: { stockItem: { select: { isPerishable: true } } } },
    },
    orderBy: [{ deliverySlot: 'asc' }, { createdAt: 'asc' }],
  })

  const now = Date.now()
  const grouped: Record<string, any[]> = {}
  for (const s of statuses) grouped[s] = []
  for (const o of orders) {
    const perishableCount = o.lines.filter((l) => l.stockItem?.isPerishable).length
    const oldestPendingMinutes = o.status === 'PENDING'
      ? Math.floor((now - new Date(o.createdAt).getTime()) / 60000)
      : 0
    grouped[o.status].push({
      id: o.id,
      orderNumber: o.orderNumber,
      contactName: o.contactName,
      deliverySlot: o.deliverySlot,
      deliveryDate: o.deliveryDate,
      lineCount: o.lines.length,
      total: Number(o.total),
      perishableCount,
      oldestPendingMinutes,
      status: o.status,
      createdAt: o.createdAt,
    })
  }

  return reply.send({ success: true, data: grouped })
}

export async function getPackQueue(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply
) {
  const { start, end } = dayRange(request.query?.date)
  const orders = await request.server.prisma.order.findMany({
    where: {
      deliveryDate: { gte: start, lte: end },
      status: { in: ['CONFIRMED', 'PICKING', 'CUTTING', 'PACKING'] },
    },
    include: { lines: true },
    orderBy: [{ deliverySlot: 'asc' }, { createdAt: 'asc' }],
  })
  return reply.send({ success: true, data: orders })
}

export async function getOrderDetail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const order = await request.server.prisma.order.findUnique({
    where: { id: request.params.id },
    include: {
      lines: { include: { stockItem: true } },
      shopCustomer: true,
      statusLogs: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { id: true, name: true, role: true } } },
      },
    },
  })
  if (!order) return reply.status(404).send({ success: false, message: 'Order not found' })
  return reply.send({ success: true, data: order })
}

export async function getPackSheet(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const order = await request.server.prisma.order.findUnique({
    where: { id: request.params.id },
    include: {
      lines: {
        include: { stockItem: { select: { itemCode: true, quantity: true, category: { select: { name: true } } } } },
      },
    },
  })
  if (!order) return reply.status(404).send({ success: false, message: 'Order not found' })

  // Aggregated cuts per category
  const cutAggregates: Record<string, { itemName: string; totalQty: number; unit: string }[]> = {}
  for (const l of order.lines) {
    const cat = l.stockItem?.category?.name || 'Other'
    if (!cutAggregates[cat]) cutAggregates[cat] = []
    cutAggregates[cat].push({
      itemName: l.itemName,
      totalQty: Number(l.quantity),
      unit: l.unit,
    })
  }

  return reply.send({ success: true, data: { order, cutAggregates } })
}

async function toggleLineField(
  request: FastifyRequest<{ Params: { id: string; lineId: string } }>,
  reply: FastifyReply,
  field: 'picked' | 'packed'
) {
  const user = request.user as any
  const { id, lineId } = request.params
  const line = await request.server.prisma.orderLine.findUnique({ where: { id: lineId } })
  if (!line || line.orderId !== id) {
    return reply.status(404).send({ success: false, message: 'Line not found' })
  }
  const newValue = !line[field]
  const data: any = {
    [field]: newValue,
    [`${field}At`]: newValue ? new Date() : null,
  }
  // Picking implies picked too
  if (field === 'packed' && newValue && !line.picked) {
    data.picked = true
    data.pickedAt = new Date()
  }
  await request.server.prisma.orderLine.update({ where: { id: lineId }, data })

  // Auto-advance when all packed
  let transitioned: any = null
  if (field === 'packed' && newValue) {
    const order = await request.server.prisma.order.findUnique({
      where: { id },
      include: { lines: true },
    })
    if (order && order.status === 'PACKING' && order.lines.every((l) => l.packed)) {
      const result = await applyStatusTransition(
        request.server.prisma,
        id,
        'READY',
        user.userId ?? null,
        user.role as Role,
        'Auto-advance: all lines packed'
      )
      if (result.ok) transitioned = result.order
    }
  }

  const fresh = await request.server.prisma.order.findUnique({
    where: { id },
    include: { lines: true },
  })
  return reply.send({ success: true, data: { order: fresh, transitioned: !!transitioned, newStatus: transitioned?.status } })
}

export async function markPicked(
  request: FastifyRequest<{ Params: { id: string; lineId: string } }>,
  reply: FastifyReply
) {
  return toggleLineField(request, reply, 'picked')
}

export async function markPacked(
  request: FastifyRequest<{ Params: { id: string; lineId: string } }>,
  reply: FastifyReply
) {
  return toggleLineField(request, reply, 'packed')
}

export async function getAlerts(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const now = new Date()
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)

  // SLA: AM orders must be READY by 10:00 local; PM by 15:00. Use UTC-ish simple logic.
  const orders = await request.server.prisma.order.findMany({
    where: {
      deliveryDate: { gte: today },
      status: { in: ['PENDING', 'CONFIRMED', 'PICKING', 'CUTTING', 'PACKING'] },
    },
    select: {
      id: true,
      orderNumber: true,
      deliverySlot: true,
      deliveryDate: true,
      status: true,
    },
  })

  const alerts: Array<{ orderId: string; orderNumber: string; slot: string; status: string; minutesOverdue: number }> = []
  for (const o of orders) {
    const cutoffHour = o.deliverySlot === 'AM' ? 10 : 15
    const dd = new Date(o.deliveryDate)
    const cutoff = new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate(), cutoffHour, 0, 0))
    const diff = (now.getTime() - cutoff.getTime()) / 60000
    if (diff > 0) {
      alerts.push({
        orderId: o.id,
        orderNumber: o.orderNumber,
        slot: o.deliverySlot,
        status: o.status,
        minutesOverdue: Math.floor(diff),
      })
    }
  }
  return reply.send({ success: true, data: alerts })
}
