import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'

export async function listQuotationTypes(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search } = request.query as any

  const where: Prisma.QuotationTypeWhereInput = {
    branchId,
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.quotationType.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
    request.server.prisma.quotationType.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function createQuotationType(
  request: FastifyRequest<{ Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { name, templateName } = request.body as any

  if (!name?.trim()) {
    return reply.status(400).send({ success: false, message: 'Name is required' })
  }

  const item = await request.server.prisma.quotationType.create({
    data: { branchId, name: name.trim(), templateName: templateName?.trim() || null },
  })
  return reply.status(201).send({ success: true, data: item })
}

export async function updateQuotationType(
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, templateName, isActive } = request.body as any

  const existing = await request.server.prisma.quotationType.findFirst({ where: { id, branchId } })
  if (!existing) return reply.status(404).send({ success: false, message: 'Not found' })

  const item = await request.server.prisma.quotationType.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(templateName !== undefined && { templateName: templateName?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  return reply.send({ success: true, data: item })
}

export async function deleteQuotationType(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const existing = await request.server.prisma.quotationType.findFirst({ where: { id: request.params.id, branchId } })
  if (!existing) return reply.status(404).send({ success: false, message: 'Not found' })

  await request.server.prisma.quotationType.delete({ where: { id: request.params.id } })
  return reply.send({ success: true, message: 'Deleted' })
}

export async function copyQuotationType(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const source = await request.server.prisma.quotationType.findFirst({ where: { id: request.params.id, branchId } })
  if (!source) return reply.status(404).send({ success: false, message: 'Not found' })

  const copy = await request.server.prisma.quotationType.create({
    data: { branchId, name: `${source.name} (Copy)`, templateName: source.templateName },
  })
  return reply.status(201).send({ success: true, data: copy })
}
