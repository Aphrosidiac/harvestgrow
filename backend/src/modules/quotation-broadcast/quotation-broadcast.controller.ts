import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'
import * as waService from '../whatsapp/whatsapp.service.js'

// ─── SUPPLIER CATEGORIES ──────────────────────────────────

export async function listSupplierCategories(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search } = request.query as any

  const where: Prisma.SupplierCategoryWhereInput = {
    branchId,
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.supplierCategory.findMany({
      where,
      include: { _count: { select: { suppliers: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.supplierCategory.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function createSupplierCategory(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { name, description } = request.body as any

  if (!name?.trim()) {
    return reply.status(400).send({ success: false, message: 'Name is required' })
  }

  const cat = await request.server.prisma.supplierCategory.create({
    data: { branchId, name: name.trim(), description: description?.trim() || null },
    include: { _count: { select: { suppliers: true } } },
  })
  return reply.status(201).send({ success: true, data: cat })
}

export async function updateSupplierCategory(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, description, isActive } = request.body as any

  const existing = await request.server.prisma.supplierCategory.findFirst({ where: { id, branchId } })
  if (!existing) return reply.status(404).send({ success: false, message: 'Not found' })

  const cat = await request.server.prisma.supplierCategory.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  return reply.send({ success: true, data: cat })
}

export async function deleteSupplierCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const existing = await request.server.prisma.supplierCategory.findFirst({ where: { id: request.params.id, branchId } })
  if (!existing) return reply.status(404).send({ success: false, message: 'Not found' })

  await request.server.prisma.supplier.updateMany({
    where: { supplierCategoryId: request.params.id },
    data: { supplierCategoryId: null },
  })
  await request.server.prisma.supplierCategory.delete({ where: { id: request.params.id } })
  return reply.send({ success: true, message: 'Deleted' })
}

export async function assignSupplierCategory(
  request: FastifyRequest<{ Body: { supplierId: string; categoryId: string | null } }>,
  reply: FastifyReply
) {
  const { supplierId, categoryId } = request.body as any
  if (!supplierId) return reply.status(400).send({ success: false, message: 'Supplier ID required' })

  await request.server.prisma.supplier.update({
    where: { id: supplierId },
    data: { supplierCategoryId: categoryId || null },
  })
  return reply.send({ success: true, message: 'Category assigned' })
}

// ─── BROADCAST ────────────────────────────────────────────

export async function broadcastQuotation(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { categoryId, country, items, message } = request.body as any

  if (!categoryId && !country) {
    return reply.status(400).send({ success: false, message: 'Select a supplier category or country' })
  }
  if (!items?.length) {
    return reply.status(400).send({ success: false, message: 'At least one item is required' })
  }

  const status = waService.getStatus()
  if (status.status !== 'connected') {
    return reply.status(400).send({ success: false, message: 'WhatsApp is not connected. Go to WhatsApp Settings to connect first.' })
  }

  const where: any = { branchId, isActive: true, phone: { not: null } }
  if (categoryId) {
    where.supplierCategoryId = categoryId
  } else if (country) {
    where.country = country
  }

  const suppliers = await request.server.prisma.supplier.findMany({
    where,
    select: { id: true, companyName: true, phone: true },
  })

  if (!suppliers.length) {
    return reply.status(400).send({ success: false, message: 'No suppliers with phone numbers match this filter' })
  }

  let text = `*HARVEST GROW VEG SDN BHD*\n📋 Quotation Request\n\n`
  for (const item of items) {
    text += `• ${item.product} — ${item.quantity} ${item.unit} @ RM ${Number(item.price).toFixed(2)}\n`
  }
  if (message) {
    text += `\n📝 ${message}`
  }
  text += `\n\nPlease confirm availability and best price. Thank you.`

  const results: { supplier: string; phone: string; status: string; error?: string }[] = []
  let sent = 0
  let failed = 0

  for (let i = 0; i < suppliers.length; i++) {
    const supplier = suppliers[i]
    try {
      if (i > 0) await new Promise((r) => setTimeout(r, 1500))
      await waService.sendMessage(supplier.phone!, text)
      results.push({ supplier: supplier.companyName, phone: supplier.phone!, status: 'sent' })
      sent++
    } catch (err: any) {
      results.push({ supplier: supplier.companyName, phone: supplier.phone!, status: 'failed', error: err.message })
      failed++
    }
  }

  return reply.send({ success: true, data: { sent, failed, total: suppliers.length, results } })
}
