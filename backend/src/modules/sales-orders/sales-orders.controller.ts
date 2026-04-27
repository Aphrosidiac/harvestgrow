import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { validate } from '../../utils/validation.js'
import { Prisma, SalesOrderStatus } from '@prisma/client'
import { generateSalesOrderNumber, calculateItemTotals, calculateOrderTotals } from './sales-orders.service.js'

const salesOrderItemSchema = z.object({
  stockItemId: z.string().optional(),
  itemCode: z.string().optional(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit: z.string().optional().default('PCS'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  discountPercent: z.coerce.number().min(0).max(100).optional().default(0),
  taxRate: z.coerce.number().min(0).optional().default(0),
  notes: z.string().optional(),
  secondDescription: z.string().optional(),
  remark: z.string().optional(),
  imageUrl: z.string().optional(),
  foc: z.boolean().optional().default(false),
  processing: z.string().optional(),
})

const orderFieldsSchema = {
  customerId: z.string().optional(),
  deliveryAddress: z.string().optional(),
  truck: z.string().optional(),
  poNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  creditTerm: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  country: z.string().optional(),
  basket: z.coerce.number().int().min(0).optional().default(0),
  box: z.coerce.number().int().min(0).optional().default(0),
  deliverRemark: z.string().optional(),
}

const createSalesOrderSchema = z.object({
  ...orderFieldsSchema,
  deliveryDate: z.string().min(1, 'Delivery date is required'),
  deliverySlot: z.string().min(1, 'Delivery slot is required'),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
})

const updateSalesOrderSchema = z.object({
  ...orderFieldsSchema,
  deliveryDate: z.string().optional(),
  deliverySlot: z.string().optional(),
  items: z.array(salesOrderItemSchema).optional(),
  status: z.nativeEnum(SalesOrderStatus).optional(),
})

const VALID_TRANSITIONS: Record<SalesOrderStatus, SalesOrderStatus[]> = {
  PENDING: ['AWAITING_SHIPMENT', 'CANCELLED', 'COMBINED'],
  AWAITING_SHIPMENT: ['COMPLETED', 'RETURN_ORDER', 'CANCELLED'],
  COMPLETED: ['RETURN_ORDER'],
  RETURN_ORDER: [],
  COMBINED: [],
  CANCELLED: [],
}

const selectFields = {
  id: true,
  salesOrderNumber: true,
  customerId: true,
  customerName: true,
  customerCompanyName: true,
  customerCompanyCode: true,
  customerBranchLocation: true,
  customerBranchCode: true,
  customerPhone: true,
  customerEmail: true,
  poNumber: true,
  invoiceNumber: true,
  deliveryDate: true,
  deliverySlot: true,
  deliveryAddress: true,
  truck: true,
  status: true,
  subtotal: true,
  taxAmount: true,
  discountAmount: true,
  totalAmount: true,
  notes: true,
  creditTerm: true,
  creditLimit: true,
  country: true,
  basket: true,
  box: true,
  deliverRemark: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} as const

export async function listSalesOrders(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, status, from, to, country, deliverySlot, sortBy, sortOrder } = request.query as any

  const where: Prisma.SalesOrderWhereInput = {
    branchId,
    ...(status && { status: status as SalesOrderStatus }),
    ...(deliverySlot && { deliverySlot }),
    ...(country && { customer: { country } }),
    ...(from && to && {
      deliveryDate: {
        gte: new Date(from),
        lte: new Date(to + 'T23:59:59.999Z'),
      },
    }),
    ...(from && !to && { deliveryDate: { gte: new Date(from) } }),
    ...(!from && to && { deliveryDate: { lte: new Date(to + 'T23:59:59.999Z') } }),
    ...(search && {
      OR: [
        { salesOrderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerCompanyName: { contains: search, mode: 'insensitive' } },
        { customerCompanyCode: { contains: search, mode: 'insensitive' } },
        { poNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const validSortFields: Record<string, string> = {
    status: 'status',
    salesOrderNumber: 'salesOrderNumber',
    poNumber: 'poNumber',
    deliveryDate: 'deliveryDate',
    customerName: 'customerName',
    totalAmount: 'totalAmount',
  }
  const orderByField = validSortFields[sortBy] || 'createdAt'
  const orderByDir = sortOrder === 'asc' ? 'asc' : 'desc'

  const [data, total] = await Promise.all([
    request.server.prisma.salesOrder.findMany({
      where,
      select: selectFields,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: limit,
    }),
    request.server.prisma.salesOrder.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getSalesOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const order = await request.server.prisma.salesOrder.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: { stockItem: { select: { id: true, imageUrl: true, cutOptions: true, quantity: true } } },
      },
      customer: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!order) {
    return reply.status(404).send({ success: false, message: 'Sales order not found' })
  }

  return reply.send({ success: true, data: order })
}

export async function createSalesOrder(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = validate(createSalesOrderSchema, request.body, reply)
  if (!data) return

  const { branchId, userId } = request.user
  const {
    customerId, deliveryDate, deliverySlot, deliveryAddress, truck,
    poNumber, invoiceNumber, notes, discountAmount, items,
    creditTerm, creditLimit, country, basket, box, deliverRemark,
  } = data

  const result = await request.server.prisma.$transaction(async (tx) => {
    const salesOrderNumber = await generateSalesOrderNumber(tx as any, branchId)

    let customerSnap: Record<string, any> = {}
    if (customerId) {
      const cust = await tx.customer.findFirst({ where: { id: customerId, branchId } })
      if (cust) {
        customerSnap = {
          customerName: cust.name,
          customerCompanyName: cust.companyName,
          customerCompanyCode: cust.companyCode,
          customerBranchLocation: cust.branchLocation,
          customerBranchCode: cust.branchCode,
          customerPhone: cust.phone,
          customerEmail: cust.email,
          creditTerm: creditTerm || cust.creditTerms || null,
          creditLimit: creditLimit ?? (cust.creditLimit ? Number(cust.creditLimit) : null),
          country: country || cust.country || null,
        }
      }
    }

    const calculatedItems = items.map((item: any, idx: number) => {
      const totals = calculateItemTotals({
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent || 0),
        taxRate: Number(item.taxRate || 0),
      })
      return {
        stockItemId: item.stockItemId || null,
        itemCode: item.itemCode || null,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent || 0),
        taxRate: Number(item.taxRate || 0),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        sortOrder: idx,
        notes: item.notes || null,
        secondDescription: item.secondDescription || null,
        remark: item.remark || null,
        imageUrl: item.imageUrl || null,
        foc: item.foc || false,
        processing: item.processing || null,
      }
    })

    const orderTotals = calculateOrderTotals(calculatedItems, Number(discountAmount || 0))

    const order = await tx.salesOrder.create({
      data: {
        branchId,
        salesOrderNumber,
        customerId: customerId || null,
        ...customerSnap,
        poNumber: poNumber || null,
        invoiceNumber: invoiceNumber || null,
        deliveryDate: new Date(deliveryDate),
        deliverySlot,
        deliveryAddress: deliveryAddress || null,
        truck: truck || null,
        notes: notes || null,
        discountAmount: Number(discountAmount || 0),
        subtotal: orderTotals.subtotal,
        taxAmount: orderTotals.taxAmount,
        totalAmount: orderTotals.totalAmount,
        basket: basket || 0,
        box: box || 0,
        deliverRemark: deliverRemark || null,
        createdById: userId,
        items: { create: calculatedItems },
      },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
    })

    return order
  })

  return reply.status(201).send({ success: true, data: result })
}

export async function updateSalesOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const data = validate(updateSalesOrderSchema, request.body, reply)
  if (!data) return

  const { branchId } = request.user
  const { id } = request.params
  const {
    customerId, deliveryDate, deliverySlot, deliveryAddress, truck,
    poNumber, invoiceNumber, notes, discountAmount, items,
    creditTerm, creditLimit, country, basket, box, deliverRemark, status,
  } = data

  const existing = await request.server.prisma.salesOrder.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Sales order not found' })
  }
  if (existing.status !== 'PENDING') {
    return reply.status(400).send({ success: false, message: 'Only PENDING orders can be edited' })
  }

  if (status && status !== existing.status) {
    const allowed = VALID_TRANSITIONS[existing.status] || []
    if (!allowed.includes(status)) {
      return reply.status(400).send({ success: false, message: `Cannot transition from ${existing.status} to ${status}` })
    }
  }

  const result = await request.server.prisma.$transaction(async (tx) => {
    let customerSnap: Record<string, any> = {}
    if (customerId) {
      const cust = await tx.customer.findFirst({ where: { id: customerId, branchId } })
      if (cust) {
        customerSnap = {
          customerName: cust.name,
          customerCompanyName: cust.companyName,
          customerCompanyCode: cust.companyCode,
          customerBranchLocation: cust.branchLocation,
          customerBranchCode: cust.branchCode,
          customerPhone: cust.phone,
          customerEmail: cust.email,
        }
      }
    }

    await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } })

    const calculatedItems = (items || []).map((item: any, idx: number) => {
      const totals = calculateItemTotals({
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent || 0),
        taxRate: Number(item.taxRate || 0),
      })
      return {
        stockItemId: item.stockItemId || null,
        itemCode: item.itemCode || null,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit || 'PCS',
        unitPrice: Number(item.unitPrice),
        discountPercent: Number(item.discountPercent || 0),
        taxRate: Number(item.taxRate || 0),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        sortOrder: idx,
        notes: item.notes || null,
        secondDescription: item.secondDescription || null,
        remark: item.remark || null,
        imageUrl: item.imageUrl || null,
        foc: item.foc || false,
        processing: item.processing || null,
      }
    })

    const orderTotals = calculateOrderTotals(calculatedItems, Number(discountAmount || 0))

    return tx.salesOrder.update({
      where: { id },
      data: {
        customerId: customerId || null,
        ...customerSnap,
        poNumber: poNumber || null,
        invoiceNumber: invoiceNumber || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        deliverySlot: deliverySlot || undefined,
        deliveryAddress: deliveryAddress || null,
        truck: truck || null,
        notes: notes || null,
        discountAmount: Number(discountAmount || 0),
        subtotal: orderTotals.subtotal,
        taxAmount: orderTotals.taxAmount,
        totalAmount: orderTotals.totalAmount,
        creditTerm: creditTerm !== undefined ? (creditTerm || null) : undefined,
        creditLimit: creditLimit !== undefined ? creditLimit : undefined,
        country: country !== undefined ? (country || null) : undefined,
        basket: basket ?? undefined,
        box: box ?? undefined,
        deliverRemark: deliverRemark !== undefined ? (deliverRemark || null) : undefined,
        ...(status && { status }),
        items: { create: calculatedItems },
      },
      include: {
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
    })
  })

  return reply.send({ success: true, data: result })
}

export async function deleteSalesOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.salesOrder.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Sales order not found' })
  }
  if (!['PENDING', 'CANCELLED'].includes(existing.status)) {
    return reply.status(400).send({ success: false, message: 'Only PENDING or CANCELLED orders can be deleted' })
  }

  await request.server.prisma.salesOrder.delete({ where: { id } })
  return reply.send({ success: true, message: 'Sales order deleted' })
}

export async function updateSalesOrderStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { status } = request.body

  const existing = await request.server.prisma.salesOrder.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Sales order not found' })
  }

  const allowed = VALID_TRANSITIONS[existing.status] || []
  if (!allowed.includes(status as SalesOrderStatus)) {
    return reply.status(400).send({
      success: false,
      message: `Cannot transition from ${existing.status} to ${status}`,
    })
  }

  const updated = await request.server.prisma.salesOrder.update({
    where: { id },
    data: { status: status as SalesOrderStatus },
    select: selectFields,
  })

  return reply.send({ success: true, data: updated })
}

export async function copySalesOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params

  const source = await request.server.prisma.salesOrder.findFirst({
    where: { id, branchId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!source) {
    return reply.status(404).send({ success: false, message: 'Sales order not found' })
  }

  const result = await request.server.prisma.$transaction(async (tx) => {
    const salesOrderNumber = await generateSalesOrderNumber(tx as any, branchId)

    return tx.salesOrder.create({
      data: {
        branchId,
        salesOrderNumber,
        customerId: source.customerId,
        customerName: source.customerName,
        customerCompanyName: source.customerCompanyName,
        customerCompanyCode: source.customerCompanyCode,
        customerBranchLocation: source.customerBranchLocation,
        customerBranchCode: source.customerBranchCode,
        customerPhone: source.customerPhone,
        customerEmail: source.customerEmail,
        poNumber: null,
        invoiceNumber: null,
        deliveryDate: source.deliveryDate,
        deliverySlot: source.deliverySlot,
        deliveryAddress: source.deliveryAddress,
        truck: source.truck,
        notes: source.notes,
        discountAmount: source.discountAmount,
        subtotal: source.subtotal,
        taxAmount: source.taxAmount,
        totalAmount: source.totalAmount,
        creditTerm: source.creditTerm,
        creditLimit: source.creditLimit,
        country: source.country,
        basket: source.basket,
        box: source.box,
        deliverRemark: source.deliverRemark,
        createdById: userId,
        items: {
          create: source.items.map((item) => ({
            stockItemId: item.stockItemId,
            itemCode: item.itemCode,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            taxRate: item.taxRate,
            subtotal: item.subtotal,
            taxAmount: item.taxAmount,
            total: item.total,
            sortOrder: item.sortOrder,
            notes: item.notes,
            secondDescription: item.secondDescription,
            remark: item.remark,
            imageUrl: item.imageUrl,
            foc: item.foc,
            processing: item.processing,
          })),
        },
      },
      select: selectFields,
    })
  })

  return reply.status(201).send({ success: true, data: result })
}

export async function getLastOrdered(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { stockItemId, customerId, limit } = request.query as any

  if (!stockItemId) {
    return reply.status(400).send({ success: false, message: 'stockItemId is required' })
  }

  const take = Math.min(parseInt(limit || '5'), 20)

  const items = await request.server.prisma.salesOrderItem.findMany({
    where: {
      stockItemId,
      salesOrder: {
        branchId,
        ...(customerId && { customerId }),
      },
    },
    select: {
      quantity: true,
      unit: true,
      unitPrice: true,
      total: true,
      salesOrder: {
        select: { deliveryDate: true, salesOrderNumber: true },
      },
    },
    orderBy: { salesOrder: { deliveryDate: 'desc' } },
    take,
  })

  return reply.send({ success: true, data: items })
}
