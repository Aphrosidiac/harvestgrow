import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { DocumentType, Prisma } from '@prisma/client'
import { recordStockHistory } from '../stock/stock.history.js'
import {
  generateDocumentNumber,
  calculateItemTotals,
  calculateDocumentTotals,
  getDefaultStatus,
  getValidStatuses,
  getConversionTargets,
} from './documents.service.js'

interface DocumentItemInput {
  stockItemId?: string
  itemCode?: string
  description: string
  quantity: number
  unit?: string
  unitPrice: number
  discountPercent?: number
  taxRate?: number
  sortOrder?: number
  serviceDate?: string
}

interface CreateDocumentBody {
  documentType: DocumentType
  customerId?: string
  vehicleId?: string
  customerName?: string
  customerCompanyName?: string
  customerPhone?: string
  customerEmail?: string
  vehiclePlate?: string
  vehicleModel?: string
  vehicleMileage?: string
  vehicleColor?: string
  vehicleEngineNo?: string
  foremanId?: string
  issueDate?: string
  dueDate?: string
  notes?: string
  terms?: string
  footerNote?: string
  discountAmount?: number
  items: DocumentItemInput[]
}

// ─── LIST ──────────────────────────────────────────────────
export async function listDocuments(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { type, status, search, from, to } = request.query as any

  const where: Prisma.DocumentWhereInput = {
    branchId,
    ...(type && { documentType: type }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerCompanyName: { contains: search, mode: 'insensitive' } },
        { vehiclePlate: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(from || to ? {
      issueDate: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + 'T23:59:59') }),
      },
    } : {}),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.document.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        foreman: { select: { id: true, name: true, jobTitle: true, phone: true } },
        _count: { select: { items: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.document.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

// ─── GET ───────────────────────────────────────────────────
export async function getDocument(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const document = await request.server.prisma.document.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      payments: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      createdBy: { select: { id: true, name: true } },
      foreman: { select: { id: true, name: true, jobTitle: true, phone: true } },
    },
  })

  if (!document) {
    return reply.status(404).send({ success: false, message: 'Document not found' })
  }

  // Add conversion targets
  const conversionTargets = getConversionTargets(document.documentType, document.status)

  return reply.send({ success: true, data: { ...document, conversionTargets } })
}

// ─── CREATE ────────────────────────────────────────────────
export async function createDocument(
  request: FastifyRequest<{ Body: CreateDocumentBody }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { documentType, items, discountAmount = 0, ...body } = request.body

  if (!documentType || !items || items.length === 0) {
    return reply.status(400).send({ success: false, message: 'Document type and at least one item are required' })
  }

  const document = await request.server.prisma.$transaction(async (tx) => {
    // Generate document number
    const documentNumber = await generateDocumentNumber(tx as any, branchId, documentType)

    // Look up stock items if referenced
    const stockItemIds = items.filter((i) => i.stockItemId).map((i) => i.stockItemId!)
    const stockItems = stockItemIds.length > 0
      ? await tx.stockItem.findMany({ where: { id: { in: stockItemIds }, branchId } })
      : []
    const stockMap = new Map(stockItems.map((s) => [s.id, s]))

    // Build items with calculated totals
    const documentItems = items.map((item, idx) => {
      const stock = item.stockItemId ? stockMap.get(item.stockItemId) : null
      const totals = calculateItemTotals({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxRate: item.taxRate,
      })
      return {
        stockItemId: item.stockItemId || null,
        itemCode: item.itemCode || stock?.itemCode || null,
        description: item.description || stock?.description || '',
        quantity: item.quantity,
        unit: item.unit || stock?.uom || 'PCS',
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        taxRate: item.taxRate || 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        sortOrder: item.sortOrder ?? idx,
        serviceDate: item.serviceDate ? new Date(item.serviceDate) : null,
      }
    })

    const docTotals = calculateDocumentTotals(documentItems, discountAmount)
    const defaultStatus = getDefaultStatus(documentType)

    // Get default notes/terms from settings
    const settings = await tx.documentSetting.findUnique({
      where: { branchId_documentType: { branchId, documentType } },
    })

    const created = await tx.document.create({
      data: {
        branchId,
        documentType,
        documentNumber,
        customerId: body.customerId || null,
        vehicleId: body.vehicleId || null,
        customerName: body.customerName,
        customerCompanyName: body.customerCompanyName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        vehiclePlate: body.vehiclePlate,
        vehicleModel: body.vehicleModel,
        vehicleMileage: body.vehicleMileage,
        vehicleColor: body.vehicleColor,
        vehicleEngineNo: body.vehicleEngineNo,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: defaultStatus,
        subtotal: docTotals.subtotal,
        taxAmount: docTotals.taxAmount,
        discountAmount,
        totalAmount: docTotals.totalAmount,
        notes: body.notes ?? settings?.defaultNotes ?? null,
        terms: body.terms ?? settings?.defaultTerms ?? null,
        footerNote: body.footerNote ?? settings?.footerNotes ?? null,
        createdById: userId,
        foremanId: body.foremanId || null,
        items: { create: documentItems },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
        foreman: { select: { id: true, name: true, jobTitle: true, phone: true } },
      },
    })

    // Hold stock for draft invoices
    if (documentType === 'INVOICE') {
      for (const item of documentItems) {
        if (item.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: item.stockItemId } })
          if (stock) {
            await tx.stockItem.update({
              where: { id: item.stockItemId },
              data: { holdQuantity: stock.holdQuantity + item.quantity },
            })
            await recordStockHistory({
              prisma: tx,
              branchId,
              stockItemId: item.stockItemId,
              type: 'HOLD',
              quantity: item.quantity,
              previousQty: stock.quantity,
              newQty: stock.quantity,
              reason: `Hold for draft ${documentNumber}`,
              documentId: created.id,
              createdById: userId,
            })
          }
        }
      }
    }

    return created
  })

  return reply.status(201).send({ success: true, data: document })
}

// ─── UPDATE ────────────────────────────────────────────────
export async function updateDocument(
  request: FastifyRequest<{ Params: { id: string }; Body: CreateDocumentBody }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { items, discountAmount = 0, ...body } = request.body

  const existing = await request.server.prisma.document.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Document not found' })
  }
  if (!['DRAFT', 'PENDING'].includes(existing.status)) {
    return reply.status(400).send({ success: false, message: 'Only draft/pending documents can be edited' })
  }

  const document = await request.server.prisma.$transaction(async (tx) => {
    // Release holds from old items (for invoices)
    if (existing.documentType === 'INVOICE') {
      const oldItems = await tx.documentItem.findMany({ where: { documentId: id } })
      for (const oldItem of oldItems) {
        if (oldItem.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: oldItem.stockItemId } })
          if (stock) {
            await tx.stockItem.update({
              where: { id: oldItem.stockItemId },
              data: { holdQuantity: Math.max(0, stock.holdQuantity - oldItem.quantity) },
            })
          }
        }
      }
    }

    // Delete old items
    await tx.documentItem.deleteMany({ where: { documentId: id } })

    // Look up stock items
    const stockItemIds = items.filter((i) => i.stockItemId).map((i) => i.stockItemId!)
    const stockItems = stockItemIds.length > 0
      ? await tx.stockItem.findMany({ where: { id: { in: stockItemIds }, branchId } })
      : []
    const stockMap = new Map(stockItems.map((s) => [s.id, s]))

    // Build new items
    const documentItems = items.map((item, idx) => {
      const stock = item.stockItemId ? stockMap.get(item.stockItemId) : null
      const totals = calculateItemTotals({
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxRate: item.taxRate,
      })
      return {
        stockItemId: item.stockItemId || null,
        itemCode: item.itemCode || stock?.itemCode || null,
        description: item.description || stock?.description || '',
        quantity: item.quantity,
        unit: item.unit || stock?.uom || 'PCS',
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent || 0,
        taxRate: item.taxRate || 0,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        total: totals.total,
        sortOrder: item.sortOrder ?? idx,
        serviceDate: item.serviceDate ? new Date(item.serviceDate) : null,
      }
    })

    const docTotals = calculateDocumentTotals(documentItems, discountAmount)

    const updated = await tx.document.update({
      where: { id },
      data: {
        customerId: body.customerId !== undefined ? (body.customerId || null) : undefined,
        vehicleId: body.vehicleId !== undefined ? (body.vehicleId || null) : undefined,
        customerName: body.customerName,
        customerCompanyName: body.customerCompanyName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        vehiclePlate: body.vehiclePlate,
        vehicleModel: body.vehicleModel,
        vehicleMileage: body.vehicleMileage,
        vehicleColor: body.vehicleColor,
        vehicleEngineNo: body.vehicleEngineNo,
        issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtotal: docTotals.subtotal,
        taxAmount: docTotals.taxAmount,
        discountAmount,
        totalAmount: docTotals.totalAmount,
        notes: body.notes,
        terms: body.terms,
        footerNote: body.footerNote,
        foremanId: body.foremanId !== undefined ? (body.foremanId || null) : undefined,
        items: { create: documentItems },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
        foreman: { select: { id: true, name: true, jobTitle: true, phone: true } },
      },
    })

    // Re-apply holds for new items (invoices only)
    if (existing.documentType === 'INVOICE') {
      for (const item of documentItems) {
        if (item.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: item.stockItemId } })
          if (stock) {
            await tx.stockItem.update({
              where: { id: item.stockItemId },
              data: { holdQuantity: stock.holdQuantity + item.quantity },
            })
          }
        }
      }
    }

    return updated
  })

  return reply.send({ success: true, data: document })
}

// ─── DELETE ────────────────────────────────────────────────
export async function deleteDocument(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.document.findFirst({
    where: { id, branchId },
    include: { _count: { select: { payments: true } } },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Document not found' })
  }
  if (existing._count.payments > 0) {
    return reply.status(400).send({ success: false, message: 'Cannot delete document with payments recorded' })
  }
  if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
    return reply.status(400).send({ success: false, message: 'Only draft/cancelled documents can be deleted' })
  }

  // Release holds for draft invoices before deleting
  if (existing.documentType === 'INVOICE' && existing.status === 'DRAFT') {
    const items = await request.server.prisma.documentItem.findMany({ where: { documentId: id } })
    for (const item of items) {
      if (item.stockItemId) {
        const stock = await request.server.prisma.stockItem.findUnique({ where: { id: item.stockItemId } })
        if (stock) {
          await request.server.prisma.stockItem.update({
            where: { id: item.stockItemId },
            data: { holdQuantity: Math.max(0, stock.holdQuantity - item.quantity) },
          })
        }
      }
    }
  }

  await request.server.prisma.document.delete({ where: { id } })
  return reply.send({ success: true, message: 'Document deleted' })
}

// ─── UPDATE STATUS ─────────────────────────────────────────
export async function updateDocumentStatus(
  request: FastifyRequest<{ Params: { id: string }; Body: { status: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { status } = request.body

  const existing = await request.server.prisma.document.findFirst({
    where: { id, branchId },
    include: { items: true },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Document not found' })
  }

  const validStatuses = getValidStatuses(existing.documentType)
  if (!validStatuses.includes(status as any)) {
    return reply.status(400).send({ success: false, message: `Invalid status '${status}' for ${existing.documentType}` })
  }

  const { userId } = request.user
  const document = await request.server.prisma.$transaction(async (tx) => {
    // Invoice: DRAFT → OUTSTANDING — release holds + deduct stock
    if (existing.documentType === 'INVOICE' && existing.status === 'DRAFT' && status === 'OUTSTANDING') {
      for (const item of existing.items) {
        if (item.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: item.stockItemId } })
          if (stock && stock.quantity < item.quantity) {
            throw Object.assign(
              new Error(`Insufficient stock for ${item.itemCode || item.description}: have ${stock.quantity}, need ${item.quantity}`),
              { statusCode: 400 }
            )
          }
          const newQty = stock!.quantity - item.quantity
          const newHold = Math.max(0, stock!.holdQuantity - item.quantity)
          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: { quantity: newQty, holdQuantity: newHold },
          })
          await recordStockHistory({
            prisma: tx,
            branchId,
            stockItemId: item.stockItemId,
            type: 'RELEASE',
            quantity: item.quantity,
            previousQty: stock!.quantity,
            newQty: stock!.quantity,
            reason: `Release hold for ${existing.documentNumber}`,
            documentId: existing.id,
            createdById: userId,
          })
          await recordStockHistory({
            prisma: tx,
            branchId,
            stockItemId: item.stockItemId,
            type: 'OUT',
            quantity: item.quantity,
            previousQty: stock!.quantity,
            newQty,
            reason: `Invoice ${existing.documentNumber}`,
            documentId: existing.id,
            createdById: userId,
          })
        }
      }
    }

    // Invoice: DRAFT → CANCELLED — release holds
    if (existing.documentType === 'INVOICE' && existing.status === 'DRAFT' && status === 'CANCELLED') {
      for (const item of existing.items) {
        if (item.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: item.stockItemId } })
          if (stock) {
            await tx.stockItem.update({
              where: { id: item.stockItemId },
              data: { holdQuantity: Math.max(0, stock.holdQuantity - item.quantity) },
            })
            await recordStockHistory({
              prisma: tx,
              branchId,
              stockItemId: item.stockItemId,
              type: 'RELEASE',
              quantity: item.quantity,
              previousQty: stock.quantity,
              newQty: stock.quantity,
              reason: `Cancel draft ${existing.documentNumber}`,
              documentId: existing.id,
              createdById: userId,
            })
          }
        }
      }
    }

    // Invoice: OUTSTANDING → DRAFT — restore stock + re-apply holds
    if (existing.documentType === 'INVOICE' && existing.status === 'OUTSTANDING' && status === 'DRAFT') {
      // Check no payments
      const paymentCount = await tx.payment.count({ where: { documentId: existing.id } })
      if (paymentCount > 0) {
        throw Object.assign(
          new Error('Cannot revert to draft: payments have been recorded'),
          { statusCode: 400 }
        )
      }
      for (const item of existing.items) {
        if (item.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: item.stockItemId } })
          const prevQty = stock?.quantity || 0
          const newQty = prevQty + item.quantity
          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: { quantity: newQty, holdQuantity: (stock?.holdQuantity || 0) + item.quantity },
          })
          await recordStockHistory({
            prisma: tx,
            branchId,
            stockItemId: item.stockItemId,
            type: 'IN',
            quantity: item.quantity,
            previousQty: prevQty,
            newQty,
            reason: `Revert to draft ${existing.documentNumber}`,
            documentId: existing.id,
            createdById: userId,
          })
          await recordStockHistory({
            prisma: tx,
            branchId,
            stockItemId: item.stockItemId,
            type: 'HOLD',
            quantity: item.quantity,
            previousQty: newQty,
            newQty,
            reason: `Re-hold for draft ${existing.documentNumber}`,
            documentId: existing.id,
            createdById: userId,
          })
        }
      }
    }

    // Invoice: PARTIAL/PAID → DRAFT (admin only) — delete payments, restore stock, re-hold
    if (existing.documentType === 'INVOICE' && ['PARTIAL', 'PAID'].includes(existing.status) && status === 'DRAFT') {
      if (request.user.role !== 'ADMIN') {
        throw Object.assign(
          new Error('Only admin can revert paid/partial invoices'),
          { statusCode: 403 }
        )
      }
      // Delete all payments
      await tx.payment.deleteMany({ where: { documentId: existing.id } })
      // Restore stock and re-apply holds (same logic as OUTSTANDING → DRAFT)
      for (const item of existing.items) {
        if (item.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: item.stockItemId } })
          const prevQty = stock?.quantity || 0
          const newQty = prevQty + item.quantity
          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: { quantity: newQty, holdQuantity: (stock?.holdQuantity || 0) + item.quantity },
          })
          await recordStockHistory({
            prisma: tx,
            branchId,
            stockItemId: item.stockItemId,
            type: 'IN',
            quantity: item.quantity,
            previousQty: prevQty,
            newQty,
            reason: `Admin revert to draft ${existing.documentNumber}`,
            documentId: existing.id,
            createdById: userId,
          })
          await recordStockHistory({
            prisma: tx,
            branchId,
            stockItemId: item.stockItemId,
            type: 'HOLD',
            quantity: item.quantity,
            previousQty: newQty,
            newQty,
            reason: `Re-hold for draft ${existing.documentNumber}`,
            documentId: existing.id,
            createdById: userId,
          })
        }
      }
      // Reset paid amount
      await tx.document.update({
        where: { id: existing.id },
        data: { paidAmount: 0 },
      })
    }

    // Any type: COMPLETED → DRAFT
    if (existing.status === 'COMPLETED' && status === 'DRAFT') {
      const paymentCount = await tx.payment.count({ where: { documentId: existing.id } })
      if (paymentCount > 0) {
        throw Object.assign(
          new Error('Cannot revert to draft: payments have been recorded'),
          { statusCode: 400 }
        )
      }
    }

    // Invoice stock restore: → VOID
    if (existing.documentType === 'INVOICE' && status === 'VOID' && !['DRAFT', 'VOID'].includes(existing.status)) {
      for (const item of existing.items) {
        if (item.stockItemId) {
          const stock = await tx.stockItem.findUnique({ where: { id: item.stockItemId } })
          const prevQty = stock?.quantity || 0
          const newQty = prevQty + item.quantity
          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: { quantity: newQty },
          })
          await recordStockHistory({
            prisma: tx,
            branchId,
            stockItemId: item.stockItemId,
            type: 'IN',
            quantity: item.quantity,
            previousQty: prevQty,
            newQty,
            reason: `Void ${existing.documentNumber}`,
            documentId: existing.id,
            createdById: userId,
          })
        }
      }
    }

    return tx.document.update({
      where: { id },
      data: { status: status as any },
      include: { items: { orderBy: { sortOrder: 'asc' } }, createdBy: { select: { id: true, name: true } } },
    })
  })

  return reply.send({ success: true, data: document })
}

// ─── ADD PAYMENT ───────────────────────────────────────────
export async function addPayment(
  request: FastifyRequest<{
    Params: { id: string }
    Body: { amount: number; paymentMethod: string; referenceNumber?: string; notes?: string; bankName?: string }
  }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params
  const { amount, paymentMethod, referenceNumber, notes, bankName } = request.body

  if (!amount || amount <= 0) {
    return reply.status(400).send({ success: false, message: 'Payment amount must be positive' })
  }

  const existing = await request.server.prisma.document.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Document not found' })
  }
  if (existing.documentType !== 'INVOICE') {
    return reply.status(400).send({ success: false, message: 'Payments can only be recorded on invoices' })
  }

  const result = await request.server.prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        documentId: id,
        amount,
        paymentMethod: paymentMethod as any,
        referenceNumber,
        notes,
        bankName,
        createdById: userId,
      },
    })

    const newPaidAmount = Math.round((existing.paidAmount.toNumber() + amount) * 100) / 100
    const totalAmount = existing.totalAmount.toNumber()

    let newStatus = existing.status
    if (newPaidAmount >= totalAmount) {
      newStatus = 'PAID'
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIAL'
    }

    const doc = await tx.document.update({
      where: { id },
      data: { paidAmount: newPaidAmount, status: newStatus },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { include: { createdBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return doc
  })

  return reply.status(201).send({ success: true, data: result })
}

// ─── CONVERT ───────────────────────────────────────────────
export async function convertDocument(
  request: FastifyRequest<{ Params: { id: string }; Body: { targetType: DocumentType } }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params
  const { targetType } = request.body

  const source = await request.server.prisma.document.findFirst({
    where: { id, branchId },
    include: { items: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!source) {
    return reply.status(404).send({ success: false, message: 'Source document not found' })
  }

  const validTargets = getConversionTargets(source.documentType, source.status)
  if (!validTargets.includes(targetType)) {
    return reply.status(400).send({
      success: false,
      message: `Cannot convert ${source.documentType} (${source.status}) to ${targetType}`,
    })
  }

  const newDoc = await request.server.prisma.$transaction(async (tx) => {
    const documentNumber = await generateDocumentNumber(tx as any, branchId, targetType)
    const defaultStatus = getDefaultStatus(targetType)

    // Copy items
    const newItems = source.items.map((item) => ({
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
    }))

    const created = await tx.document.create({
      data: {
        branchId,
        documentType: targetType,
        documentNumber,
        customerName: source.customerName,
        customerCompanyName: source.customerCompanyName,
        customerPhone: source.customerPhone,
        customerEmail: source.customerEmail,
        vehiclePlate: source.vehiclePlate,
        vehicleModel: source.vehicleModel,
        vehicleMileage: source.vehicleMileage,
        vehicleColor: source.vehicleColor,
        vehicleEngineNo: source.vehicleEngineNo,
        issueDate: new Date(),
        dueDate: source.dueDate,
        status: defaultStatus,
        subtotal: source.subtotal,
        taxAmount: source.taxAmount,
        discountAmount: source.discountAmount,
        totalAmount: source.totalAmount,
        paidAmount: targetType === 'RECEIPT' ? source.totalAmount : 0,
        notes: source.notes,
        terms: source.terms,
        footerNote: source.footerNote,
        createdById: userId,
        convertedFromId: source.id,
        convertedFromType: source.documentType,
        items: { create: newItems },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    // Update source status to COMPLETED (for quotations)
    if (source.documentType === 'QUOTATION') {
      await tx.document.update({ where: { id: source.id }, data: { status: 'COMPLETED' } })
    }

    return created
  })

  return reply.status(201).send({ success: true, data: newDoc })
}
