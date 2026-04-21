import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'

export async function getAgentSettings(request: FastifyRequest, reply: FastifyReply) {
  const keys = [
    'whatsapp.agent.employee.active',
    'whatsapp.agent.client.active',
    'whatsapp.agent.client.greeting',
    'whatsapp.agent.employee.blocked',
  ]
  const settings = await request.server.prisma.setting.findMany({ where: { key: { in: keys } } })
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))

  return reply.send({
    success: true,
    data: {
      employeeActive: map['whatsapp.agent.employee.active'] !== 'false',
      clientActive: map['whatsapp.agent.client.active'] !== 'false',
      clientGreeting: map['whatsapp.agent.client.greeting'] || '',
      blockedPhones: map['whatsapp.agent.employee.blocked'] ? JSON.parse(map['whatsapp.agent.employee.blocked']) : [],
    },
  })
}

export async function updateAgentSettings(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
  const { employeeActive, clientActive, clientGreeting, blockedPhones } = request.body as any

  const upserts: { key: string; value: string }[] = []
  if (employeeActive !== undefined) upserts.push({ key: 'whatsapp.agent.employee.active', value: String(employeeActive) })
  if (clientActive !== undefined) upserts.push({ key: 'whatsapp.agent.client.active', value: String(clientActive) })
  if (clientGreeting !== undefined) upserts.push({ key: 'whatsapp.agent.client.greeting', value: clientGreeting })
  if (blockedPhones !== undefined) upserts.push({ key: 'whatsapp.agent.employee.blocked', value: JSON.stringify(blockedPhones) })

  for (const { key, value } of upserts) {
    await request.server.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }

  return reply.send({ success: true, message: 'Settings updated' })
}

export async function listChats(request: FastifyRequest<{ Querystring: Record<string, any> }>, reply: FastifyReply) {
  const { page, limit, skip } = getPaginationParams(request.query)
  const { agentType, search } = request.query as any

  const where: any = {
    ...(agentType && { agentType }),
    ...(search && {
      OR: [
        { phone: { contains: search } },
        { contactName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.whatsAppChat.findMany({
      where,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    }),
    request.server.prisma.whatsAppChat.count({ where }),
  ])

  const chats = data.map((c) => ({
    id: c.id,
    phone: c.phone,
    contactName: c.contactName,
    agentType: c.agentType,
    messageCount: c.messageCount,
    lastMessageAt: c.lastMessageAt,
    lastMessage: c.messages[0]?.content?.slice(0, 100) || '',
    lastMessageRole: c.messages[0]?.role || '',
    createdAt: c.createdAt,
  }))

  return reply.send(paginatedResponse(chats, total, page, limit))
}

export async function getChatMessages(request: FastifyRequest<{ Params: { id: string }; Querystring: Record<string, any> }>, reply: FastifyReply) {
  const { id } = request.params
  const { page, limit, skip } = getPaginationParams(request.query)

  const chat = await request.server.prisma.whatsAppChat.findUnique({ where: { id } })
  if (!chat) return reply.status(404).send({ success: false, message: 'Chat not found' })

  const [messages, total] = await Promise.all([
    request.server.prisma.whatsAppMessage.findMany({
      where: { chatId: id },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.whatsAppMessage.count({ where: { chatId: id } }),
  ])

  return reply.send({ success: true, data: { chat, messages }, total, page, limit })
}

export async function deleteChat(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await request.server.prisma.whatsAppChat.delete({ where: { id: request.params.id } })
  return reply.send({ success: true, message: 'Chat deleted' })
}

export async function getAgentStats(request: FastifyRequest, reply: FastifyReply) {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0)

  const [totalChats, employeeChats, clientChats, todayMessages] = await Promise.all([
    request.server.prisma.whatsAppChat.count(),
    request.server.prisma.whatsAppChat.count({ where: { agentType: 'EMPLOYEE' } }),
    request.server.prisma.whatsAppChat.count({ where: { agentType: 'CLIENT' } }),
    request.server.prisma.whatsAppMessage.count({ where: { createdAt: { gte: today } } }),
  ])

  return reply.send({
    success: true,
    data: { totalChats, employeeChats, clientChats, todayMessages },
  })
}
