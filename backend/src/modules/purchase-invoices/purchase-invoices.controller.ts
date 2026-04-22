import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'
import { recordStockHistory } from '../stock/stock.history.js'
import { validate } from '../../utils/validation.js'

// ─── ZOD SCHEMAS ──────────────────────────────────────────

const purchaseInvoiceItemSchema = z.object({
  stockItemId: z.string().optional(),
  itemCode: z.string().optional(),
  description: z.string().min(1, 'Item description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
})

const createPurchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  items: z.array(purchaseInvoiceItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  issueDate: z.string().optional(),
  receivedDate: z.string().optional(),
})

const updatePurchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1).optional(),
  invoiceNumber: z.string().min(1).optional(),
  items: z.array(purchaseInvoiceItemSchema).min(1).optional(),
  notes: z.string().optional(),
  issueDate: z.string().optional(),
  receivedDate: z.string().nullable().optional(),
})

// ─── LIST ──────────────────────────────────────────────────
export async function listPurchaseInvoices(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, supplierId, status, from, to } = request.query as any

  const where: Prisma.PurchaseInvoiceWhereInput = {
    branchId,
    ...(supplierId && { supplierId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { internalNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to + 'T23:59:59') }),
          },
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, companyName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.purchaseInvoice.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

// ─── GET ───────────────────────────────────────────────────
export async function getPurchaseInvoice(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user

  const invoice = await request.server.prisma.purchaseInvoice.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      supplier: true,
      createdBy: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
      attachments: true,
    },
  })

  if (!invoice) {
    return reply.status(404).send({ success: false, message: 'Purchase invoice not found' })
  }

  return reply.send({ success: true, data: invoice })
}

// ─── INTERNAL NUMBER GENERATOR ─────────────────────────────
async function generateInternalNumber(prisma: any, branchId: string): Promise<string> {
  const yy = new Date().getFullYear().toString().slice(-2)
  const prefix = `PI${yy}-`

  const lastPI = await prisma.purchaseInvoice.findFirst({
    where: { branchId, internalNumber: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { internalNumber: true },
  })

  let seq = 1
  if (lastPI?.internalNumber) {
    const parts = lastPI.internalNumber.split('-')
    const lastSeq = parseInt(parts[1], 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`
}

// ─── CREATE ────────────────────────────────────────────────
export async function createPurchaseInvoice(
  request: FastifyRequest<{
    Body: {
      supplierId: string
      invoiceNumber: string
      items: Array<{
        stockItemId?: string
        itemCode?: string
        description: string
        quantity: number
        unitPrice: number
      }>
      notes?: string
      issueDate?: string
      receivedDate?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user

  const parsed = validate(createPurchaseInvoiceSchema, request.body, reply)
  if (!parsed) return
  const { supplierId, invoiceNumber, items, notes, issueDate, receivedDate } = parsed

  const internalNumber = await generateInternalNumber(request.server.prisma, branchId)

  // Calculate totals
  const itemsData = items.map((item, index) => {
    const total = item.quantity * item.unitPrice
    return {
      stockItemId: item.stockItemId || null,
      itemCode: item.itemCode || null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total,
      sortOrder: index,
    }
  })

  const subtotal = itemsData.reduce((sum, i) => sum + i.total, 0)

  const invoice = await request.server.prisma.purchaseInvoice.create({
    data: {
      branchId,
      supplierId,
      invoiceNumber,
      internalNumber,
      subtotal,
      totalAmount: subtotal,
      notes: notes || null,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      receivedDate: receivedDate ? new Date(receivedDate) : null,
      createdById: userId,
      items: { create: itemsData },
    },
    include: {
      supplier: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return reply.status(201).send({ success: true, data: invoice })
}

// ─── UPDATE ────────────────────────────────────────────────
export async function updatePurchaseInvoice(
  request: FastifyRequest<{
    Params: { id: string }
    Body: {
      supplierId?: string
      invoiceNumber?: string
      items?: Array<{
        stockItemId?: string
        itemCode?: string
        description: string
        quantity: number
        unitPrice: number
      }>
      notes?: string
      issueDate?: string
      receivedDate?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const parsed = validate(updatePurchaseInvoiceSchema, request.body, reply)
  if (!parsed) return
  const { supplierId, invoiceNumber, items, notes, issueDate, receivedDate } = parsed

  const existing = await request.server.prisma.purchaseInvoice.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Purchase invoice not found' })
  }
  if (existing.status !== 'ON_HOLD') {
    return reply.status(400).send({ success: false, message: 'Only ON_HOLD invoices can be updated' })
  }

  const updateData: any = {
    ...(supplierId && { supplierId }),
    ...(invoiceNumber && { invoiceNumber }),
    ...(notes !== undefined && { notes: notes || null }),
    ...(issueDate && { issueDate: new Date(issueDate) }),
    ...(receivedDate !== undefined && { receivedDate: receivedDate ? new Date(receivedDate) : null }),
  }

  if (items?.length) {
    // Delete existing items and recreate
    await request.server.prisma.purchaseInvoiceItem.deleteMany({
      where: { purchaseInvoiceId: id },
    })

    const itemsData = items.map((item, index) => {
      const total = item.quantity * item.unitPrice
      return {
        purchaseInvoiceId: id,
        stockItemId: item.stockItemId || null,
        itemCode: item.itemCode || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total,
        sortOrder: index,
      }
    })

    const subtotal = itemsData.reduce((sum, i) => sum + i.total, 0)
    updateData.subtotal = subtotal
    updateData.totalAmount = subtotal

    await request.server.prisma.purchaseInvoiceItem.createMany({ data: itemsData })
  }

  const invoice = await request.server.prisma.purchaseInvoice.update({
    where: { id },
    data: updateData,
    include: {
      supplier: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  return reply.send({ success: true, data: invoice })
}

// ─── CHECK ITEM ────────────────────────────────────────────
export async function checkItem(
  request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id, itemId } = request.params

  const invoice = await request.server.prisma.purchaseInvoice.findFirst({
    where: { id, branchId },
  })
  if (!invoice) {
    return reply.status(404).send({ success: false, message: 'Purchase invoice not found' })
  }

  const item = await request.server.prisma.purchaseInvoiceItem.findFirst({
    where: { id: itemId, purchaseInvoiceId: id },
  })
  if (!item) {
    return reply.status(404).send({ success: false, message: 'Item not found' })
  }

  const updated = await request.server.prisma.purchaseInvoiceItem.update({
    where: { id: itemId },
    data: { isChecked: !item.isChecked },
  })

  return reply.send({ success: true, data: updated })
}

// ─── CHECK ALL ITEMS ───────────────────────────────────────
export async function checkAllItems(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const invoice = await request.server.prisma.purchaseInvoice.findFirst({
    where: { id, branchId },
  })
  if (!invoice) {
    return reply.status(404).send({ success: false, message: 'Purchase invoice not found' })
  }

  await request.server.prisma.purchaseInvoiceItem.updateMany({
    where: { purchaseInvoiceId: id },
    data: { isChecked: true },
  })

  return reply.send({ success: true, message: 'All items checked' })
}

// ─── VERIFY ────────────────────────────────────────────────
export async function verifyInvoice(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const invoice = await request.server.prisma.purchaseInvoice.findFirst({
    where: { id, branchId },
    include: { items: true },
  })
  if (!invoice) {
    return reply.status(404).send({ success: false, message: 'Purchase invoice not found' })
  }
  if (invoice.status !== 'ON_HOLD') {
    return reply.status(400).send({ success: false, message: 'Only ON_HOLD invoices can be verified' })
  }

  const unchecked = invoice.items.filter((i) => !i.isChecked)
  if (unchecked.length > 0) {
    return reply.status(400).send({
      success: false,
      message: `${unchecked.length} item(s) have not been checked`,
    })
  }

  const updated = await request.server.prisma.purchaseInvoice.update({
    where: { id },
    data: { status: 'VERIFIED' },
  })

  return reply.send({ success: true, data: updated })
}

// ─── FINALIZE ──────────────────────────────────────────────
export async function finalizeInvoice(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params
  const prisma = request.server.prisma

  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id, branchId },
    include: { items: true },
  })
  if (!invoice) {
    return reply.status(404).send({ success: false, message: 'Purchase invoice not found' })
  }
  if (invoice.status !== 'VERIFIED') {
    return reply.status(400).send({ success: false, message: 'Only VERIFIED invoices can be finalized' })
  }

  await prisma.$transaction(async (tx: any) => {
    for (const item of invoice.items) {
      if (!item.stockItemId) continue

      const stockItem = await tx.stockItem.findUnique({
        where: { id: item.stockItemId },
        select: { id: true, quantity: true },
      })
      if (!stockItem) continue

      const previousQty = stockItem.quantity
      const newQty = previousQty + item.quantity

      // Update stock quantity
      await tx.stockItem.update({
        where: { id: item.stockItemId },
        data: { quantity: newQty },
      })

      // Record stock history
      await recordStockHistory({
        prisma: tx,
        branchId,
        stockItemId: item.stockItemId,
        type: 'IN',
        quantity: item.quantity,
        previousQty,
        newQty,
        reason: `Purchase ${invoice.internalNumber}`,
        createdById: userId,
      })
    }

    // Set status to FINALIZED
    await tx.purchaseInvoice.update({
      where: { id },
      data: { status: 'FINALIZED' },
    })
  })

  const updated = await prisma.purchaseInvoice.findFirst({
    where: { id },
    include: { supplier: true, items: { orderBy: { sortOrder: 'asc' } } },
  })

  return reply.send({ success: true, data: updated })
}

// ─── CANCEL ────────────────────────────────────────────────
export async function cancelInvoice(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const invoice = await request.server.prisma.purchaseInvoice.findFirst({
    where: { id, branchId },
  })
  if (!invoice) {
    return reply.status(404).send({ success: false, message: 'Purchase invoice not found' })
  }
  if (invoice.status === 'FINALIZED') {
    return reply.status(400).send({ success: false, message: 'FINALIZED invoices cannot be cancelled' })
  }
  if (invoice.status === 'CANCELLED') {
    return reply.status(400).send({ success: false, message: 'Invoice is already cancelled' })
  }

  const updated = await request.server.prisma.purchaseInvoice.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  return reply.send({ success: true, data: updated })
}
