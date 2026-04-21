import { FastifyRequest, FastifyReply } from 'fastify'
import * as waService from './whatsapp.service.js'

export async function getWhatsAppStatus(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send({ success: true, data: waService.getStatus() })
}

export async function getWhatsAppQR(_request: FastifyRequest, reply: FastifyReply) {
  const qr = waService.getQR()
  return reply.send({ success: true, data: { qr } })
}

export async function connectWhatsApp(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const result = await waService.initConnection()
    return reply.send({ success: true, data: result })
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message || 'Failed to connect' })
  }
}

export async function disconnectWhatsApp(_request: FastifyRequest, reply: FastifyReply) {
  try {
    await waService.disconnect()
    return reply.send({ success: true, message: 'Disconnected' })
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message || 'Failed to disconnect' })
  }
}

export async function sendTestMessage(
  request: FastifyRequest<{ Body: { phone: string; message: string } }>,
  reply: FastifyReply
) {
  const { phone, message } = request.body as any
  if (!phone || !message) {
    return reply.status(400).send({ success: false, message: 'Phone and message are required' })
  }

  try {
    const result = await waService.sendMessage(phone, message)
    return reply.send({ success: true, data: result })
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message || 'Failed to send message' })
  }
}
