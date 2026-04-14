import { FastifyRequest, FastifyReply } from 'fastify'
import { hashPassword, verifyPassword } from '../../utils/password.js'

export async function listUsers(request: FastifyRequest, reply: FastifyReply) {
  const { branchId } = request.user
  const users = await request.server.prisma.user.findMany({
    where: { branchId, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })
  return reply.send({ success: true, data: users })
}

export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = request.user

  const user = await request.server.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      branchId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      branch: { select: { id: true, name: true, code: true, address: true, phone: true, email: true, ssmNumber: true, bankName: true, bankAccount: true } },
    },
  })

  if (!user) {
    return reply.status(404).send({ success: false, message: 'User not found' })
  }

  return reply.send({ success: true, data: user })
}

export async function updateProfile(
  request: FastifyRequest<{ Body: { name?: string; email?: string } }>,
  reply: FastifyReply
) {
  const { userId } = request.user
  const { name, email } = request.body

  if (email) {
    const existing = await request.server.prisma.user.findFirst({
      where: { email, id: { not: userId } },
    })
    if (existing) {
      return reply.status(400).send({ success: false, message: 'Email already in use' })
    }
  }

  const user = await request.server.prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
    },
    select: { id: true, email: true, name: true, role: true, branchId: true },
  })

  return reply.send({ success: true, data: user })
}

export async function changePassword(
  request: FastifyRequest<{ Body: { currentPassword: string; newPassword: string } }>,
  reply: FastifyReply
) {
  const { userId } = request.user
  const { currentPassword, newPassword } = request.body

  if (!currentPassword || !newPassword) {
    return reply.status(400).send({ success: false, message: 'Current and new password are required' })
  }

  if (newPassword.length < 6) {
    return reply.status(400).send({ success: false, message: 'New password must be at least 6 characters' })
  }

  const user = await request.server.prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return reply.status(404).send({ success: false, message: 'User not found' })
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) {
    return reply.status(400).send({ success: false, message: 'Current password is incorrect' })
  }

  const passwordHash = await hashPassword(newPassword)
  await request.server.prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  return reply.send({ success: true, message: 'Password changed successfully' })
}

export async function updateBranch(
  request: FastifyRequest<{ Body: { name?: string; address?: string; phone?: string; email?: string; ssmNumber?: string; bankName?: string; bankAccount?: string } }>,
  reply: FastifyReply
) {
  const { branchId, role } = request.user

  if (role !== 'ADMIN') {
    return reply.status(403).send({ success: false, message: 'Only admins can update branch details' })
  }

  const { name, address, phone, email, ssmNumber, bankName, bankAccount } = request.body

  const branch = await request.server.prisma.branch.update({
    where: { id: branchId },
    data: {
      ...(name && { name: name.trim() }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(ssmNumber !== undefined && { ssmNumber: ssmNumber?.trim() || null }),
      ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
      ...(bankAccount !== undefined && { bankAccount: bankAccount?.trim() || null }),
    },
    select: { id: true, name: true, code: true, address: true, phone: true, email: true, ssmNumber: true, bankName: true, bankAccount: true },
  })

  return reply.send({ success: true, data: branch })
}
