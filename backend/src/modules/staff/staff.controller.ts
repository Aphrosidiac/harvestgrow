import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function listStaff(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, role } = request.query as any

  const where: Prisma.UserWhereInput = {
    branchId,
    ...(role && { role }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { foremanDocuments: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.user.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function getStaff(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const staff = await request.server.prisma.user.findFirst({
    where: { id: request.params.id, branchId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { foremanDocuments: true } },
    },
  })

  if (!staff) {
    return reply.status(404).send({ success: false, message: 'Staff not found' })
  }

  return reply.send({ success: true, data: staff })
}

export async function createStaff(
  request: FastifyRequest<{
    Body: {
      name: string
      email: string
      password: string
      phone?: string
      jobTitle?: string
      role?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { name, email, password, phone, jobTitle, role } = request.body

  if (!name?.trim() || !email?.trim() || !password) {
    return reply.status(400).send({ success: false, message: 'Name, email, and password are required' })
  }

  if (password.length < 6) {
    return reply.status(400).send({ success: false, message: 'Password must be at least 6 characters' })
  }

  // Check email uniqueness
  const existing = await request.server.prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  })
  if (existing) {
    return reply.status(400).send({ success: false, message: 'Email already in use' })
  }

  const validRoles = ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER', 'DRIVER']
  const userRole = role && validRoles.includes(role) ? role : 'PACKER'

  const passwordHash = await bcrypt.hash(password, 10)

  const staff = await request.server.prisma.user.create({
    data: {
      branchId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      phone: phone?.trim() || null,
      jobTitle: jobTitle?.trim() || null,
      role: userRole as any,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  return reply.status(201).send({ success: true, data: staff })
}

export async function updateStaff(
  request: FastifyRequest<{
    Params: { id: string }
    Body: {
      name?: string
      email?: string
      phone?: string
      jobTitle?: string
      role?: string
      isActive?: boolean
    }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, email, phone, jobTitle, role, isActive } = request.body

  const existing = await request.server.prisma.user.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Staff not found' })
  }

  // Prevent deactivating yourself
  if (id === request.user.userId && isActive === false) {
    return reply.status(400).send({ success: false, message: 'Cannot deactivate your own account' })
  }

  // Check email uniqueness if changing
  if (email && email.trim().toLowerCase() !== existing.email) {
    const emailExists = await request.server.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    })
    if (emailExists) {
      return reply.status(400).send({ success: false, message: 'Email already in use' })
    }
  }

  const validRoles = ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER', 'DRIVER']

  const staff = await request.server.prisma.user.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle?.trim() || null }),
      ...(role && validRoles.includes(role) && { role: role as any }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })

  return reply.send({ success: true, data: staff })
}

export async function resetPassword(
  request: FastifyRequest<{
    Params: { id: string }
    Body: { password: string }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { password } = request.body

  if (!password || password.length < 6) {
    return reply.status(400).send({ success: false, message: 'Password must be at least 6 characters' })
  }

  const existing = await request.server.prisma.user.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Staff not found' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await request.server.prisma.user.update({
    where: { id },
    data: { passwordHash },
  })

  return reply.send({ success: true, message: 'Password reset successfully' })
}
