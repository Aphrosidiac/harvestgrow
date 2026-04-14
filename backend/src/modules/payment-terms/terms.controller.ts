import { FastifyRequest, FastifyReply } from 'fastify'

export async function listTerms(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user
  const terms = await request.server.prisma.paymentTerm.findMany({
    where: { branchId },
    orderBy: { days: 'asc' },
  })
  return reply.send({ success: true, data: terms })
}

export async function createTerm(
  request: FastifyRequest<{ Body: { name: string; days: number; description?: string; isDefault?: boolean } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { name, days, description, isDefault } = request.body

  if (!name || days === undefined) {
    return reply.status(400).send({ success: false, message: 'Name and days are required' })
  }

  const term = await request.server.prisma.paymentTerm.create({
    data: { branchId, name, days, description, isDefault: isDefault || false },
  })
  return reply.status(201).send({ success: true, data: term })
}

export async function updateTerm(
  request: FastifyRequest<{ Params: { id: string }; Body: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.paymentTerm.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Payment term not found' })
  }

  const term = await request.server.prisma.paymentTerm.update({
    where: { id },
    data: request.body,
  })
  return reply.send({ success: true, data: term })
}

export async function deleteTerm(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.paymentTerm.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Payment term not found' })
  }

  await request.server.prisma.paymentTerm.delete({ where: { id } })
  return reply.send({ success: true, message: 'Payment term deleted' })
}
