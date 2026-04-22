import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { validate } from '../../utils/validation.js'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

const createStaffSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER', 'DRIVER']).optional().default('PACKER'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  userGroup: z.enum(['SUPER_ADMIN', 'BOSS', 'ADMIN', 'INVENTORY_MANAGER']).optional().nullable(),
})

export async function listStaff(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search, role, status, userGroup } = request.query as any

  const where: Prisma.UserWhereInput = {
    branchId,
    ...(role && { role }),
    ...(userGroup && { userGroup }),
    ...(status === 'active' && { isActive: true }),
    ...(status === 'inactive' && { isActive: false }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        jobTitle: true,
        role: true,
        userGroup: true,
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
      username: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      userGroup: true,
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
      username?: string
      phone?: string
      jobTitle?: string
      role?: string
      userGroup?: string
    }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const data = validate(createStaffSchema, request.body, reply)
  if (!data) return

  const { name, email, password, username, phone, jobTitle, role, userGroup } = data

  // Check email uniqueness
  const existing = await request.server.prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  })
  if (existing) {
    return reply.status(400).send({ success: false, message: 'Email already in use' })
  }

  // Check username uniqueness
  if (username?.trim()) {
    const usernameExists = await request.server.prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    })
    if (usernameExists) {
      return reply.status(400).send({ success: false, message: 'Username already in use' })
    }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const staff = await request.server.prisma.user.create({
    data: {
      branchId,
      username: username?.trim()?.toLowerCase() || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      phone: phone?.trim() || null,
      jobTitle: jobTitle?.trim() || null,
      role: role as any,
      userGroup: (userGroup ?? null) as any,
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      userGroup: true,
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
      username?: string
      phone?: string
      jobTitle?: string
      role?: string
      userGroup?: string | null
      isActive?: boolean
    }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, email, username, phone, jobTitle, role, userGroup, isActive } = request.body

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

  // Check username uniqueness if changing
  if (username !== undefined && username?.trim()?.toLowerCase() !== existing.username) {
    if (username?.trim()) {
      const usernameExists = await request.server.prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() },
      })
      if (usernameExists) {
        return reply.status(400).send({ success: false, message: 'Username already in use' })
      }
    }
  }

  const validRoles = ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER', 'DRIVER']
  const validGroups = ['SUPER_ADMIN', 'BOSS', 'ADMIN', 'INVENTORY_MANAGER']

  const staff = await request.server.prisma.user.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(username !== undefined && { username: username?.trim()?.toLowerCase() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(jobTitle !== undefined && { jobTitle: jobTitle?.trim() || null }),
      ...(role && validRoles.includes(role) && { role: role as any }),
      ...(userGroup !== undefined && { userGroup: (userGroup && validGroups.includes(userGroup) ? userGroup : null) as any }),
      ...(isActive !== undefined && { isActive }),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      role: true,
      userGroup: true,
      isActive: true,
      createdAt: true,
    },
  })

  return reply.send({ success: true, data: staff })
}

export async function deleteStaff(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId, userId } = request.user
  const { id } = request.params

  if (id === userId) {
    return reply.status(400).send({ success: false, message: 'Cannot delete your own account' })
  }

  const existing = await request.server.prisma.user.findFirst({
    where: { id, branchId },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Staff not found' })
  }

  await request.server.prisma.user.update({
    where: { id },
    data: { isActive: false },
  })

  return reply.send({ success: true, message: 'User deleted' })
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
