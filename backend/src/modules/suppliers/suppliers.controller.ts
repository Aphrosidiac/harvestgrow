import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { validate } from '../../utils/validation.js'
import { Prisma } from '@prisma/client'

const createSupplierSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().optional(),
  shortForm: z.string().optional(),
  code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  notes: z.string().optional(),
})

const updateSupplierSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().nullable().optional(),
  shortForm: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAccount: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

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
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = validate(createSupplierSchema, request.body, reply)
  if (!data) return

  const { branchId } = request.user
  const { companyName, contactName, shortForm, code, phone, email, address, bankName, bankAccount, notes } = data

  const supplier = await request.server.prisma.supplier.create({
    data: {
      branchId,
      companyName: companyName.trim(),
      contactName: contactName?.trim() || null,
      shortForm: shortForm?.trim() || null,
      code: code?.trim() || null,
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
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const data = validate(updateSupplierSchema, request.body, reply)
  if (!data) return

  const { branchId } = request.user
  const { id } = request.params
  const { companyName, contactName, shortForm, code, phone, email, address, bankName, bankAccount, notes } = data

  const existing = await request.server.prisma.supplier.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Supplier not found' })
  }

  const supplier = await request.server.prisma.supplier.update({
    where: { id },
    data: {
      ...(companyName && { companyName: companyName.trim() }),
      ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
      ...(shortForm !== undefined && { shortForm: shortForm?.trim() || null }),
      ...(code !== undefined && { code: code?.trim() || null }),
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
