import { FastifyRequest, FastifyReply } from 'fastify'
import { Prisma, OrderStatus, Role } from '@prisma/client'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import {
  generateInvoiceFromOrder,
  generateDeliveryOrderFromOrder,
  resolveCustomerForOrder,
} from '../documents/documents.generator.js'

export async function listOrders(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { page, limit, skip } = getPaginationParams(request.query)
  const { status, deliveryDate, search } = request.query as any

  const where: Prisma.OrderWhereInput = {
    ...(status && { status: status as OrderStatus }),
    ...(deliveryDate && {
      deliveryDate: {
        gte: new Date(deliveryDate + 'T00:00:00.000Z'),
        lte: new Date(deliveryDate + 'T23:59:59.999Z'),
      },
    }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactPhone: { contains: search } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { lines: true } } },
    }),
    request.server.prisma.order.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const order = await request.server.prisma.order.findUnique({
    where: { id: request.params.id },
    include: {
      lines: true,
      shopCustomer: true,
      invoice: { select: { id: true, documentNumber: true, status: true, totalAmount: true } },
      deliveryOrder: { select: { id: true, documentNumber: true, status: true } },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { id: true, name: true, role: true } } },
      },
    },
  })
  if (!order) return reply.status(404).send({ success: false, message: 'Order not found' })
  return reply.send({ success: true, data: order })
}

export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PICKING', 'CANCELLED'],
  PICKING:          ['CUTTING', 'PACKING', 'CANCELLED'],
  CUTTING:          ['PACKING', 'CANCELLED'],
  PACKING:          ['READY', 'CANCELLED'],
  READY:            ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED:        [],
  CANCELLED:        [],
}

export const ROLE_TRANSITIONS: Record<Role, OrderStatus[] | 'ALL'> = {
  ADMIN:      'ALL',
  MANAGER:    'ALL',
  PRODUCTION: ['CONFIRMED', 'PICKING', 'CUTTING', 'PACKING', 'READY', 'CANCELLED'],
  PACKER:     ['PACKING', 'READY'],
  DRIVER:     ['OUT_FOR_DELIVERY', 'DELIVERED'],
}

export function canRoleSet(role: Role, status: OrderStatus): boolean {
  const allowed = ROLE_TRANSITIONS[role]
  if (allowed === 'ALL') return true
  return allowed.includes(status)
}

/**
 * Apply a status transition inside a transaction. Used by other controllers too.
 * Returns { ok, order?, error?, shortages? }.
 */
export async function applyStatusTransition(
  prisma: any,
  orderId: string,
  toStatus: OrderStatus,
  userId: string | null,
  role: Role,
  note?: string | null
): Promise<{ ok: true; order: any } | { ok: false; status: number; body: any }> {
  return await prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    })
    if (!order) return { ok: false, status: 404, body: { success: false, message: 'Order not found' } }

    const from: OrderStatus = order.status
    if (from === toStatus) {
      return { ok: true, order }
    }
    if (!TRANSITIONS[from].includes(toStatus)) {
      return {
        ok: false,
        status: 400,
        body: { success: false, message: `Invalid transition ${from} → ${toStatus}` },
      }
    }
    if (!canRoleSet(role, toStatus)) {
      return {
        ok: false,
        status: 403,
        body: { success: false, message: `Role ${role} cannot set status ${toStatus}` },
      }
    }

    // Stock re-check on entering PACKING
    if (toStatus === 'PACKING') {
      const shortages: Array<{ stockItemId: string; itemName: string; available: number; required: number }> = []
      for (const line of order.lines) {
        const stock = await tx.stockItem.findUnique({ where: { id: line.stockItemId } })
        if (!stock) continue
        const required = Math.ceil(Number(line.quantity))
        if (stock.quantity < required) {
          shortages.push({
            stockItemId: stock.id,
            itemName: line.itemName,
            available: stock.quantity,
            required,
          })
        }
      }
      if (shortages.length) {
        return {
          ok: false,
          status: 409,
          body: { success: false, error: 'INSUFFICIENT_STOCK', shortages },
        }
      }
    }

    // Restore stock on cancellation (stock was decremented at shop checkout)
    if (toStatus === 'CANCELLED' && from !== 'DELIVERED' && from !== 'CANCELLED') {
      for (const line of order.lines) {
        await tx.stockItem.update({
          where: { id: line.stockItemId },
          data: { quantity: { increment: Math.ceil(Number(line.quantity)) } },
        })
      }
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: toStatus },
      include: { lines: true, shopCustomer: true },
    })

    await tx.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: from,
        toStatus,
        changedById: userId,
        note: note || null,
      },
    })

    return { ok: true, order: updated }
  })
}

export async function updateOrderStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: { status: OrderStatus; note?: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const role = user.role as Role
  const { status, note } = request.body || ({} as any)

  if (!status || !(status in TRANSITIONS)) {
    return reply.status(400).send({ success: false, message: 'Invalid status' })
  }

  const result = await applyStatusTransition(
    request.server.prisma,
    request.params.id,
    status,
    user.userId ?? null,
    role,
    note ?? null
  )
  if (!result.ok) return reply.status(result.status).send(result.body)
  return reply.send({ success: true, data: result.order })
}

// ─── Generate Invoice from Order ────────────────────────────
export async function generateInvoice(
  request: FastifyRequest<{ Params: { id: string }; Body: { customerId?: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const { branchId, userId, role } = user
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return reply.status(403).send({ success: false, message: 'ADMIN/MANAGER only' })
  }
  try {
    const result = await request.server.prisma.$transaction(async (tx) => {
      return generateInvoiceFromOrder(tx as any, {
        branchId,
        orderId: request.params.id,
        createdById: userId,
        customerId: request.body?.customerId,
      })
    })
    return reply.send({ success: true, data: result })
  } catch (err: any) {
    return reply.status(err.statusCode || 400).send({ success: false, message: err.message || 'Failed to generate invoice' })
  }
}

// ─── Generate Delivery Order from Order ─────────────────────
export async function generateDeliveryOrder(
  request: FastifyRequest<{ Params: { id: string }; Body: { customerId?: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const { branchId, userId, role } = user
  if (!['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER'].includes(role)) {
    return reply.status(403).send({ success: false, message: 'Not allowed' })
  }
  try {
    const result = await request.server.prisma.$transaction(async (tx) => {
      return generateDeliveryOrderFromOrder(tx as any, {
        branchId,
        orderId: request.params.id,
        createdById: userId,
        customerId: request.body?.customerId,
      })
    })
    return reply.send({ success: true, data: result })
  } catch (err: any) {
    return reply.status(err.statusCode || 400).send({ success: false, message: err.message || 'Failed to generate DO' })
  }
}

// ─── Bulk generate invoices for DELIVERED orders on date ────
export async function bulkGenerateInvoices(
  request: FastifyRequest<{ Body: { date?: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const { branchId, userId, role } = user
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return reply.status(403).send({ success: false, message: 'ADMIN/MANAGER only' })
  }
  const dateStr = request.body?.date
  const start = dateStr ? new Date(dateStr + 'T00:00:00.000Z') : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z')
  const end = new Date(start.getTime() + 24 * 3600 * 1000)

  const orders = await request.server.prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      invoiceId: null,
      deliveryDate: { gte: start, lt: end },
    },
    select: { id: true, orderNumber: true },
  })

  const items: Array<{ orderId: string; orderNumber: string; ok: boolean; documentNumber?: string; error?: string }> = []
  let generated = 0
  let skipped = 0
  for (const o of orders) {
    try {
      const res = await request.server.prisma.$transaction(async (tx) => {
        return generateInvoiceFromOrder(tx as any, { branchId, orderId: o.id, createdById: userId })
      })
      items.push({ orderId: o.id, orderNumber: o.orderNumber, ok: true, documentNumber: res.documentNumber })
      if (res.reused) skipped += 1
      else generated += 1
    } catch (err: any) {
      skipped += 1
      items.push({ orderId: o.id, orderNumber: o.orderNumber, ok: false, error: err.message })
    }
  }

  return reply.send({ success: true, data: { generated, skipped, items } })
}

// ─── Promote ShopCustomer → Customer ────────────────────────
export async function promoteCustomer(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const { branchId, role } = user
  if (!['ADMIN', 'MANAGER'].includes(role)) {
    return reply.status(403).send({ success: false, message: 'ADMIN/MANAGER only' })
  }
  try {
    const result = await request.server.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: request.params.id },
        include: { shopCustomer: true },
      })
      if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 })
      const customer = await resolveCustomerForOrder(tx as any, branchId, order)
      return customer
    })
    return reply.send({ success: true, data: result })
  } catch (err: any) {
    return reply.status(err.statusCode || 400).send({ success: false, message: err.message })
  }
}

export async function cancelOrder(
  request: FastifyRequest<{ Params: { id: string }; Body: { note?: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const role = user.role as Role
  const result = await applyStatusTransition(
    request.server.prisma,
    request.params.id,
    'CANCELLED',
    user.userId ?? null,
    role,
    request.body?.note ?? null
  )
  if (!result.ok) return reply.status(result.status).send(result.body)
  return reply.send({ success: true, data: result.order })
}
