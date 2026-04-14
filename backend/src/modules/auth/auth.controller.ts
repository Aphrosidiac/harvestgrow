import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyPassword } from '../../utils/password.js'

async function writeAudit(request: FastifyRequest, data: { userId?: string | null; branchId?: string | null; action: string; entity: string; entityId?: string | null; changes?: any }) {
  try {
    await request.server.prisma.auditLog.create({
      data: {
        branchId: data.branchId ?? null,
        userId: data.userId ?? null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId ?? null,
        method: request.method,
        path: request.url,
        ipAddress: request.ip,
        userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
        changes: data.changes ?? null,
      },
    })
  } catch (err) {
    request.log.error({ err }, 'audit log failed')
  }
}

export async function login(request: FastifyRequest<{ Body: { email: string; password: string } }>, reply: FastifyReply) {
  const { email, password } = request.body

  if (!email || !password) {
    return reply.status(400).send({ success: false, message: 'Email and password are required' })
  }

  const user = await request.server.prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.isActive) {
    await writeAudit(request, { action: 'LOGIN_FAILED', entity: 'auth', changes: { email, reason: 'not_found_or_inactive' } })
    return reply.status(401).send({ success: false, message: 'Invalid credentials' })
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    await writeAudit(request, { userId: user.id, branchId: user.branchId, action: 'LOGIN_FAILED', entity: 'auth', entityId: user.id, changes: { email, reason: 'bad_password' } })
    return reply.status(401).send({ success: false, message: 'Invalid credentials' })
  }

  await writeAudit(request, { userId: user.id, branchId: user.branchId, action: 'LOGIN', entity: 'auth', entityId: user.id, changes: { email } })

  const token = request.server.jwt.sign({
    userId: user.id,
    branchId: user.branchId,
    role: user.role,
  })

  return reply.send({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        jobTitle: user.jobTitle,
        role: user.role,
        branchId: user.branchId,
      },
    },
  })
}

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = request.user

  const user = await request.server.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, phone: true, jobTitle: true, role: true, branchId: true },
  })

  if (!user) {
    return reply.status(404).send({ success: false, message: 'User not found' })
  }

  return reply.send({ success: true, data: user })
}
