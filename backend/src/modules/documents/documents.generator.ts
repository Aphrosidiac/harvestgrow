import { DocumentStatus, DocumentType } from '@prisma/client'
import { generateDocumentNumber } from './documents.service.js'

export type GenTxLike = any

/**
 * Ensure a Customer record exists for an order. Priority:
 * 1. explicit customerId (validate it)
 * 2. existing ShopCustomer → Customer link
 * 3. create a new Customer (optionally linked to ShopCustomer)
 */
export async function resolveCustomerForOrder(
  tx: GenTxLike,
  branchId: string,
  order: any,
  explicitCustomerId?: string
): Promise<{ customerId: string | null; customerName: string; customerPhone: string; customerEmail: string | null; customerCompanyName: string | null }> {
  if (explicitCustomerId) {
    const c = await tx.customer.findFirst({ where: { id: explicitCustomerId, branchId } })
    if (c) {
      return {
        customerId: c.id,
        customerName: c.name || order.contactName,
        customerPhone: c.phone || order.contactPhone,
        customerEmail: c.email || order.contactEmail || null,
        customerCompanyName: c.companyName || null,
      }
    }
  }

  if (order.shopCustomerId) {
    const linked = await tx.customer.findFirst({ where: { shopCustomerId: order.shopCustomerId, branchId } })
    if (linked) {
      return {
        customerId: linked.id,
        customerName: linked.name || order.contactName,
        customerPhone: linked.phone || order.contactPhone,
        customerEmail: linked.email || order.contactEmail || null,
        customerCompanyName: linked.companyName || null,
      }
    }
  }

  // Create a new Customer from order contact info
  // Check: Customer.shopCustomerId is @unique, so guard against concurrent linking
  const shopCustomerId = order.shopCustomerId || null
  if (shopCustomerId) {
    const race = await tx.customer.findFirst({ where: { shopCustomerId, branchId } })
    if (race) {
      return {
        customerId: race.id,
        customerName: race.name || order.contactName,
        customerPhone: race.phone || order.contactPhone,
        customerEmail: race.email || order.contactEmail || null,
        customerCompanyName: race.companyName || null,
      }
    }
  }

  const created = await tx.customer.create({
    data: {
      branchId,
      name: order.contactName,
      phone: order.contactPhone || null,
      email: order.contactEmail || null,
      address: order.deliveryAddress || null,
      shopCustomerId,
    },
  })
  return {
    customerId: created.id,
    customerName: created.name,
    customerPhone: created.phone || order.contactPhone,
    customerEmail: created.email,
    customerCompanyName: null,
  }
}

function orderLineDescription(line: any): string {
  let desc = line.itemName
  if (line.cutStyle) desc += ` (${line.cutStyle})`
  if (line.notes) desc += ` — ${line.notes}`
  return desc
}

/**
 * Generate an Invoice Document from an Order. Does NOT commit; caller is
 * responsible for running it inside a transaction if desired.
 * If order already has an invoice, returns that existing invoice.
 */
export async function generateInvoiceFromOrder(
  tx: GenTxLike,
  opts: { branchId: string; orderId: string; createdById: string; customerId?: string }
): Promise<{ documentId: string; documentNumber: string; total: number; reused: boolean }> {
  const { branchId, orderId, createdById, customerId } = opts

  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { lines: true, shopCustomer: true },
  })
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 })

  if (order.invoiceId) {
    const existing = await tx.document.findUnique({ where: { id: order.invoiceId } })
    if (existing) {
      return {
        documentId: existing.id,
        documentNumber: existing.documentNumber,
        total: Number(existing.totalAmount),
        reused: true,
      }
    }
  }

  const customer = await resolveCustomerForOrder(tx, branchId, order, customerId)

  const documentNumber = await generateDocumentNumber(tx, branchId, 'INVOICE')

  // Determine due date (paymentTerms)
  const settings = await tx.documentSetting.findUnique({
    where: { branchId_documentType: { branchId, documentType: 'INVOICE' as DocumentType } },
  })
  const termDays = settings?.defaultPaymentTermDays ?? 7
  const issueDate = new Date()
  const dueDate = new Date(issueDate.getTime() + termDays * 24 * 3600 * 1000)

  const items = order.lines.map((l: any, idx: number) => {
    const qty = Math.max(1, Math.round(Number(l.quantity)))
    const unitPrice = Number(l.unitPrice)
    const lineTotal = Number((unitPrice * Number(l.quantity)).toFixed(2))
    return {
      stockItemId: l.stockItemId,
      description: orderLineDescription(l),
      quantity: qty,
      unit: l.unit,
      unitPrice,
      discountPercent: 0,
      taxRate: 0,
      subtotal: lineTotal,
      taxAmount: 0,
      total: lineTotal,
      sortOrder: idx,
    }
  })

  const subtotal = Number(order.subtotal)
  const total = Number(order.total)

  const doc = await tx.document.create({
    data: {
      branchId,
      documentType: 'INVOICE',
      documentNumber,
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerCompanyName: customer.customerCompanyName,
      customerPhone: customer.customerPhone,
      customerEmail: customer.customerEmail,
      issueDate,
      dueDate,
      status: 'OUTSTANDING' as DocumentStatus,
      subtotal,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: total,
      notes: order.notes || settings?.defaultNotes || null,
      terms: settings?.defaultTerms || null,
      footerNote: settings?.footerNotes || null,
      createdById,
      items: { create: items },
    },
  })

  await tx.order.update({
    where: { id: order.id },
    data: { invoiceId: doc.id },
  })

  // Mirror status log
  await tx.orderStatusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      changedById: createdById,
      note: `Invoice ${documentNumber} generated`,
    },
  })

  return { documentId: doc.id, documentNumber, total, reused: false }
}

/**
 * Generate a Delivery Order Document from an Order.
 */
export async function generateDeliveryOrderFromOrder(
  tx: GenTxLike,
  opts: { branchId: string; orderId: string; createdById: string; customerId?: string }
): Promise<{ documentId: string; documentNumber: string; reused: boolean }> {
  const { branchId, orderId, createdById, customerId } = opts

  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { lines: true, shopCustomer: true },
  })
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 })

  if (order.deliveryOrderId) {
    const existing = await tx.document.findUnique({ where: { id: order.deliveryOrderId } })
    if (existing) {
      return { documentId: existing.id, documentNumber: existing.documentNumber, reused: true }
    }
  }

  const allowed = ['PACKING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']
  if (!allowed.includes(order.status)) {
    throw Object.assign(new Error(`Order must be in ${allowed.join('/')} status to generate DO`), { statusCode: 400 })
  }

  const customer = await resolveCustomerForOrder(tx, branchId, order, customerId)
  const documentNumber = await generateDocumentNumber(tx, branchId, 'DELIVERY_ORDER')

  const items = order.lines.map((l: any, idx: number) => {
    const qty = Math.max(1, Math.round(Number(l.quantity)))
    return {
      stockItemId: l.stockItemId,
      description: (function () {
        let d = l.itemName
        if (l.cutStyle) d += ` (${l.cutStyle})`
        if (l.notes) d += ` — ${l.notes}`
        return d
      })(),
      quantity: qty,
      unit: l.unit,
      unitPrice: 0,
      discountPercent: 0,
      taxRate: 0,
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      sortOrder: idx,
    }
  })

  const doc = await tx.document.create({
    data: {
      branchId,
      documentType: 'DELIVERY_ORDER',
      documentNumber,
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerCompanyName: customer.customerCompanyName,
      customerPhone: customer.customerPhone,
      customerEmail: customer.customerEmail,
      issueDate: new Date(),
      status: 'APPROVED' as DocumentStatus,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 0,
      notes: [order.deliveryAddress ? `Deliver to: ${order.deliveryAddress}` : null, order.notes].filter(Boolean).join('\n') || null,
      createdById,
      items: { create: items },
    },
  })

  await tx.order.update({
    where: { id: order.id },
    data: { deliveryOrderId: doc.id },
  })

  await tx.orderStatusLog.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: order.status,
      changedById: createdById,
      note: `Delivery Order ${documentNumber} generated`,
    },
  })

  return { documentId: doc.id, documentNumber, reused: false }
}
