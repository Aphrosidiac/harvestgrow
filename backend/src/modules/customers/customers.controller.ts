import { FastifyRequest, FastifyReply } from 'fastify'
import { getPaginationParams, paginatedResponse } from '../../utils/pagination.js'
import { Prisma } from '@prisma/client'

export async function listCustomers(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { page, limit, skip } = getPaginationParams(request.query)
  const { search } = request.query as any

  const where: Prisma.CustomerWhereInput = {
    branchId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { vehicles: { some: { plate: { contains: search, mode: 'insensitive' } } } },
        { vehicles: { some: { model: { contains: search, mode: 'insensitive' } } } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    request.server.prisma.customer.findMany({
      where,
      include: {
        vehicles: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
        _count: { select: { documents: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    request.server.prisma.customer.count({ where }),
  ])

  return reply.send(paginatedResponse(data, total, page, limit))
}

export async function searchCustomers(
  request: FastifyRequest<{ Querystring: { q: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { q } = request.query as any

  if (!q || q.length < 1) {
    return reply.send({ success: true, data: [] })
  }

  const customers = await request.server.prisma.customer.findMany({
    where: {
      branchId,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { vehicles: { some: { plate: { contains: q, mode: 'insensitive' } } } },
        { vehicles: { some: { model: { contains: q, mode: 'insensitive' } } } },
      ],
    },
    include: {
      vehicles: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
    },
    take: 10,
    orderBy: { name: 'asc' },
  })

  return reply.send({ success: true, data: customers })
}

export async function getCustomer(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const customer = await request.server.prisma.customer.findFirst({
    where: { id: request.params.id, branchId },
    include: {
      vehicles: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
      _count: { select: { documents: true } },
    },
  })

  if (!customer) {
    return reply.status(404).send({ success: false, message: 'Customer not found' })
  }

  return reply.send({ success: true, data: customer })
}

export async function createCustomer(
  request: FastifyRequest<{
    Body: { name: string; phone?: string; email?: string; companyName?: string; vehicles?: { plate: string; make?: string; model?: string; color?: string; engineNo?: string; mileage?: string }[] }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { name, phone, email, companyName, vehicles } = request.body

  const customerName = name?.trim() || phone?.trim() || 'Walk-in'

  const customer = await request.server.prisma.customer.create({
    data: {
      branchId,
      name: customerName,
      companyName: companyName?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      ...(vehicles?.length && {
        vehicles: {
          create: vehicles.map((v, i) => ({
            plate: v.plate.trim().toUpperCase(),
            make: v.make?.trim() || null,
            model: v.model?.trim() || null,
            color: v.color?.trim() || null,
            engineNo: v.engineNo?.trim() || null,
            mileage: v.mileage?.trim() || null,
            isDefault: i === 0,
          })),
        },
      }),
    },
    include: { vehicles: true },
  })

  return reply.status(201).send({ success: true, data: customer })
}

export async function updateCustomer(
  request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; phone?: string; email?: string; companyName?: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { name, phone, email, companyName } = request.body

  const existing = await request.server.prisma.customer.findFirst({ where: { id, branchId } })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Customer not found' })
  }

  const customer = await request.server.prisma.customer.update({
    where: { id },
    data: {
      ...(name && { name: name.trim() }),
      ...(companyName !== undefined && { companyName: companyName?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
    },
    include: { vehicles: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] } },
  })

  return reply.send({ success: true, data: customer })
}

export async function deleteCustomer(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  const existing = await request.server.prisma.customer.findFirst({
    where: { id, branchId },
    include: { _count: { select: { documents: true } } },
  })
  if (!existing) {
    return reply.status(404).send({ success: false, message: 'Customer not found' })
  }
  if (existing._count.documents > 0) {
    return reply.status(400).send({ success: false, message: `Cannot delete customer with ${existing._count.documents} document(s)` })
  }

  await request.server.prisma.customer.delete({ where: { id } })
  return reply.send({ success: true, message: 'Customer deleted' })
}

// ─── VEHICLES ──────────────────────────────────────────────
export async function addVehicle(
  request: FastifyRequest<{
    Params: { id: string }
    Body: { plate: string; make?: string; model?: string; color?: string; engineNo?: string; mileage?: string; isDefault?: boolean }
  }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params
  const { plate, make, model, color, engineNo, mileage, isDefault } = request.body

  const customer = await request.server.prisma.customer.findFirst({ where: { id, branchId } })
  if (!customer) {
    return reply.status(404).send({ success: false, message: 'Customer not found' })
  }

  if (!plate?.trim()) {
    return reply.status(400).send({ success: false, message: 'Plate number is required' })
  }

  // If setting as default, unset others
  if (isDefault) {
    await request.server.prisma.vehicle.updateMany({
      where: { customerId: id },
      data: { isDefault: false },
    })
  }

  const vehicle = await request.server.prisma.vehicle.create({
    data: {
      customerId: id,
      plate: plate.trim().toUpperCase(),
      make: make?.trim() || null,
      model: model?.trim() || null,
      color: color?.trim() || null,
      engineNo: engineNo?.trim() || null,
      mileage: mileage?.trim() || null,
      isDefault: isDefault || false,
    },
  })

  return reply.status(201).send({ success: true, data: vehicle })
}

export async function updateVehicle(
  request: FastifyRequest<{
    Params: { id: string; vid: string }
    Body: { plate?: string; make?: string; model?: string; color?: string; engineNo?: string; mileage?: string; isDefault?: boolean }
  }>,
  reply: FastifyReply
) {
  const { id, vid } = request.params
  const { plate, make, model, color, engineNo, mileage, isDefault } = request.body

  if (isDefault) {
    await request.server.prisma.vehicle.updateMany({
      where: { customerId: id },
      data: { isDefault: false },
    })
  }

  const vehicle = await request.server.prisma.vehicle.update({
    where: { id: vid },
    data: {
      ...(plate && { plate: plate.trim().toUpperCase() }),
      ...(make !== undefined && { make: make?.trim() || null }),
      ...(model !== undefined && { model: model?.trim() || null }),
      ...(color !== undefined && { color: color?.trim() || null }),
      ...(engineNo !== undefined && { engineNo: engineNo?.trim() || null }),
      ...(mileage !== undefined && { mileage: mileage?.trim() || null }),
      ...(isDefault !== undefined && { isDefault }),
    },
  })

  return reply.send({ success: true, data: vehicle })
}

export async function deleteVehicle(
  request: FastifyRequest<{ Params: { id: string; vid: string } }>,
  reply: FastifyReply
) {
  const { vid } = request.params
  await request.server.prisma.vehicle.delete({ where: { id: vid } })
  return reply.send({ success: true, message: 'Vehicle deleted' })
}
