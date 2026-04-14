import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'

export async function listSupplierPayments(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, supplierId, from, to } = request.query as any

  const where: Prisma.SupplierPaymentWhereInput = {
    branchId,
    ...(supplierId && { supplierId }),
    ...(from || to ? {
      paymentDate: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
      },
    } : {}),
    ...(search && {
      OR: [
        { paymentNumber: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.supplierPayment.findMany({
      where,
      include: {
        supplier: { select: { id: true, companyName: true } },
        purchaseInvoice: { select: { id: true, internalNumber: true } },
      },
      orderBy: { paymentDate: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.supplierPayment.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getSupplierPayment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user

  const payment = await request.server.prisma.supplierPayment.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      supplier: true,
      purchaseInvoice: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  if (!payment) {
    return reply.status(404).send({ success: false, message: 'Payment not found' })
  }

  return reply.send({ success: true, data: payment })
}

export async function createSupplierPayment(
  request: FastifyRequest<{
    Body: {
      supplierId: string
      purchaseInvoiceId?: string
      amount: number
      paymentMethod: string
      referenceNumber?: string
      notes?: string
      bankName?: string
      paymentDate?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { supplierId, purchaseInvoiceId, amount, paymentMethod, referenceNumber, notes, bankName, paymentDate } = request.body

  if (!supplierId || !amount || !paymentMethod) {
    return reply.status(400).send({ success: false, message: 'supplierId, amount, and paymentMethod are required' })
  }

  if (amount <= 0) {
    return reply.status(400).send({ success: false, message: 'Amount must be positive' })
  }

  const validMethods = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'EWALLET', 'TNG', 'BOOST']
  if (!validMethods.includes(paymentMethod)) {
    return reply.status(400).send({ success: false, message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` })
  }

  // Auto-generate paymentNumber: PAY{YY}-{0001}
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const prefix = `PAY${yy}-`

  const lastPayment = await request.server.prisma.supplierPayment.findFirst({
    where: { branchId, paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' },
    select: { paymentNumber: true },
  })

  let nextSeq = 1
  if (lastPayment) {
    const lastSeq = parseInt(lastPayment.paymentNumber.replace(prefix, ''), 10)
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1
  }

  const paymentNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`

  const payment = await request.server.prisma.$transaction(async (tx) => {
    const created = await tx.supplierPayment.create({
      data: {
        branchId,
        supplierId,
        purchaseInvoiceId: purchaseInvoiceId || null,
        paymentNumber,
        amount,
        paymentMethod: paymentMethod as any,
        referenceNumber: referenceNumber?.trim() || null,
        notes: notes?.trim() || null,
        bankName: bankName?.trim() || null,
        paymentDate: paymentDate ? new Date(paymentDate) : now,
        createdById: userId,
      },
      include: {
        supplier: { select: { id: true, companyName: true } },
        purchaseInvoice: { select: { id: true, internalNumber: true } },
      },
    })

    // Update PurchaseInvoice paidAmount if linked
    if (purchaseInvoiceId) {
      await tx.purchaseInvoice.update({
        where: { id: purchaseInvoiceId },
        data: { paidAmount: { increment: amount } },
      })
    }

    return created
  })

  return reply.status(201).send({ success: true, data: payment })
}

export async function deleteSupplierPayment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user

  const payment = await request.server.prisma.supplierPayment.findFirst({
    where: { id: request.params.id, branchId },
  })

  if (!payment) {
    return reply.status(404).send({ success: false, message: 'Payment not found' })
  }

  await request.server.prisma.$transaction(async (tx) => {
    // Subtract from PurchaseInvoice paidAmount if linked
    if (payment.purchaseInvoiceId) {
      await tx.purchaseInvoice.update({
        where: { id: payment.purchaseInvoiceId },
        data: { paidAmount: { decrement: payment.amount } },
      })
    }

    await tx.supplierPayment.delete({ where: { id: payment.id } })
  })

  return reply.send({ success: true, message: 'Payment deleted' })
}
