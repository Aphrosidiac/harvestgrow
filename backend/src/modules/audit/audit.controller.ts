import { FastifyRequest, FastifyReply } from 'fastify'

type ListQuery = {
  page?: string
  limit?: string
  userId?: string
  entity?: string
  action?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export async function listAuditLogs(request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) {
  const { userId, entity, action, dateFrom, dateTo, search } = request.query
  const page = Math.max(1, parseInt(request.query.page ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '30', 10)))
  const skip = (page - 1) * limit

  const where: any = { branchId: request.user.branchId }
  if (userId) where.userId = userId
  if (entity) where.entity = entity
  if (action) where.action = action
  if (dateFrom || dateTo) {
    where.createdAt = {}
    if (dateFrom) where.createdAt.gte = new Date(dateFrom)
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59')
  }
  if (search) {
    where.OR = [
      { path: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    request.server.prisma.auditLog.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' },
    }),
    request.server.prisma.auditLog.count({ where }),
  ])

  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean))) as string[]
  const users = userIds.length
    ? await request.server.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  return reply.send({
    success: true,
    data: rows.map((r) => ({
      ...r,
      user: r.userId ? userMap.get(r.userId) ?? null : null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
