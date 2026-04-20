import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'

export async function listCustomerGroups(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, status } = request.query as any

  const where: Prisma.CustomerGroupWhereInput = {
    branchId,
    ...(status === 'active' && { isActive: true }),
    ...(status === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.customerGroup.findMany({
      where,
      include: { _count: { select: { customers: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.customerGroup.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getCustomerGroup(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const group = await request.server.prisma.customerGroup.findFirst({
    where: { id: request.params.id, branchId },
    include: { _count: { select: { customers: true } } },
  })
  if (!group) {
    return reply.status(404).send({ success: false, message: 'Customer group not found' })
  }
  return reply.send({ success: true, data: group })
}

export async function createCustomerGroup(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { name, term, country, priceType, method, value, quotationTemplate, custValidation } = request.body as any

  if (!name?.trim()) {
    return reply.status(400).send({ success: false, message: 'Name is required' })
  }

  const existing = await request.server.prisma.customerGroup.findFirst({
    where: { branchId, name: name.trim() },
  })
  if (existing) {
    return reply.status(400).send({ success: false, message: 'Customer group name already exists' })
  }

  const group = await request.server.prisma.customerGroup.create({
    data: {
      branchId,
      name: name.trim(),
      term: parseInt(term) || 7,
      country: country || null,
      priceType: priceType || null,
      method: method || null,
      value: value ? Number(value) : null,
      quotationTemplate: quotationTemplate || null,
      custValidation: custValidation || null,
    },
  })

  return reply.status(201).send({ success: true, data: group })
}

export async function updateCustomerGroup(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, term, country, priceType, method, value, quotationTemplate, custValidation, isActive } = request.body as any

  const existing = await request.server.prisma.customerGroup.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Customer group not found' })
  }

  if (name && name.trim() !== existing.name) {
    const dup = await request.server.prisma.customerGroup.findFirst({
      where: { branchId, name: name.trim(), id: { not: id } },
    })
    if (dup) {
      return reply.status(400).send({ success: false, message: 'Customer group name already exists' })
    }
  }

  const group = await request.server.prisma.customerGroup.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(term !== undefined && { term: parseInt(term) || 7 }),
      ...(country !== undefined && { country: country || null }),
      ...(priceType !== undefined && { priceType: priceType || null }),
      ...(method !== undefined && { method: method || null }),
      ...(value !== undefined && { value: value ? Number(value) : null }),
      ...(quotationTemplate !== undefined && { quotationTemplate: quotationTemplate || null }),
      ...(custValidation !== undefined && { custValidation: custValidation || null }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return reply.send({ success: true, data: group })
}

export async function deleteCustomerGroup(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.customerGroup.findFirst({
    where: { id, branchId },
    include: { _count: { select: { customers: true } } },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Customer group not found' })
  }
  if (existing._count.customers > 0) {
    return reply.status(400).send({ success: false, message: 'Cannot delete group with assigned customers' })
  }

  await request.server.prisma.customerGroup.delete({ where: { id } })
  return reply.send({ success: true, message: 'Customer group deleted' })
}
