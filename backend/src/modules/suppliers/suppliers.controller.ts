import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'

export async function listSuppliers(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search } = request.query as any

  const where: Prisma.SupplierWhereInput = {
    branchId,
    isActive: true,
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchaseInvoices: true } },
      },
      orderBy: { companyName: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.supplier.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getSupplier(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const supplier = await request.server.prisma.supplier.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      _count: { select: { purchaseInvoices: true } },
    },
  })

  if (!supplier) {
    return reply.status(404).send({ success: false, message: 'Supplier not found' })
  }

  return reply.send({ success: true, data: supplier })
}

export async function createSupplier(
  request: FastifyRequest<{
    Body: {
      companyName: string
      contactName?: string
      phone?: string
      email?: string
      address?: string
      bankName?: string
      bankAccount?: string
      notes?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { companyName, contactName, phone, email, address, bankName, bankAccount, notes } = request.body

  if (!companyName?.trim()) {
    return reply.status(400).send({ success: false, message: 'Company name is required' })
  }

  const supplier = await request.server.prisma.supplier.create({
    data: {
      branchId,
      companyName: companyName.trim(),
      contactName: contactName?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      bankName: bankName?.trim() || null,
      bankAccount: bankAccount?.trim() || null,
      notes: notes?.trim() || null,
    },
  })

  return reply.status(201).send({ success: true, data: supplier })
}

export async function updateSupplier(
  request: FastifyRequest<{
    Params: { id: string }
    Body: {
      companyName?: string
      contactName?: string
      phone?: string
      email?: string
      address?: string
      bankName?: string
      bankAccount?: string
      notes?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { companyName, contactName, phone, email, address, bankName, bankAccount, notes } = request.body

  const existing = await request.server.prisma.supplier.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Supplier not found' })
  }

  const supplier = await request.server.prisma.supplier.update({
    where: { id },
    data: {
      ...(companyName && { companyName: companyName.trim() }),
      ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
      ...(bankAccount !== undefined && { bankAccount: bankAccount?.trim() || null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
  })

  return reply.send({ success: true, data: supplier })
}

export async function deleteSupplier(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.supplier.findFirst({
    where: { id, branchId },
    include: { _count: { select: { purchaseInvoices: true } } },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Supplier not found' })
  }

  if (existing._count.purchaseInvoices > 0) {
    // Soft delete - has related invoices
    await request.server.prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    })
    return reply.send({ success: true, message: 'Supplier deactivated' })
  }

  await request.server.prisma.supplier.delete({ where: { id } })
  return reply.send({ success: true, message: 'Supplier deleted' })
}
