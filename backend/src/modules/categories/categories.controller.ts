import { FastifyRequest, FastifyReply } from 'fastify'

export async function listCategories(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user

  const categories = await request.server.prisma.stockCategory.findMany({
    where: { branchId },
    include: { _count: { select: { items: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return reply.send({ success: true, data: categories })
}

export async function createCategory(
  request: FastifyRequest<{ Body: { name: string; code?: string; sortOrder?: number } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { name, code, sortOrder } = request.body

  if (!name || !name.trim()) {
    return reply.status(400).send({ success: false, message: 'Name is required' })
  }

  const category = await request.server.prisma.stockCategory.create({
    data: { branchId, name: name.trim(), code: code?.trim() || null, ...(sortOrder !== undefined && { sortOrder }) },
  })

  return reply.status(201).send({ success: true, data: category })
}

export async function updateCategory(
  request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; code?: string; sortOrder?: number } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, code, sortOrder } = request.body

  const existing = await request.server.prisma.stockCategory.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Category not found' })
  }

  const category = await request.server.prisma.stockCategory.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(code !== undefined && { code: code?.trim() || null }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  })

  return reply.send({ success: true, data: category })
}

export async function deleteCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.stockCategory.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Category not found' })
  }

  const itemCount = await request.server.prisma.stockItem.count({ where: { categoryId: id } })
  if (itemCount > 0) {
    return reply.status(400).send({ success: false, message: `Cannot delete category with ${itemCount} items` })
  }

  await request.server.prisma.stockCategory.delete({ where: { id } })
  return reply.send({ success: true, message: 'Category deleted' })
}
