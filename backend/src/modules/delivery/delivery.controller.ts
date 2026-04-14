import { FastifyRequest, FastifyReply } from 'fastify'
import { OrderStatus, Role, TripStatus, StopStatus } from '@prisma/client'
import { applyStatusTransition } from '../orders/orders.controller.js'
import { generateInvoiceFromOrder } from '../documents/documents.generator.js'

function startOfDayUTC(dateStr?: string) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00.000Z') : new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}
function endOfDayUTC(dateStr?: string) {
  const d = startOfDayUTC(dateStr)
  d.setUTCHours(23, 59, 59, 999)
  return d
}

// ─── Driver management (dispatcher) ─────────────────────────
export async function listDrivers(request: FastifyRequest, reply: FastifyReply) {
  const drivers = await request.server.prisma.driver.findMany({
    where: { active: true },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return reply.send({ success: true, data: drivers })
}

export async function createDriver(
  request: FastifyRequest<{ Body: { userId: string; vehiclePlate?: string; phone?: string } }>,
  reply: FastifyReply
) {
  const { userId, vehiclePlate, phone } = request.body || ({} as any)
  if (!userId) return reply.status(400).send({ success: false, message: 'userId required' })
  const user = await request.server.prisma.user.findUnique({ where: { id: userId } })
  if (!user) return reply.status(404).send({ success: false, message: 'User not found' })
  if (user.role !== 'DRIVER') {
    return reply.status(400).send({ success: false, message: 'User must have role DRIVER' })
  }
  const existing = await request.server.prisma.driver.findUnique({ where: { userId } })
  if (existing) return reply.status(409).send({ success: false, message: 'Driver profile already exists' })
  const driver = await request.server.prisma.driver.create({
    data: { userId, vehiclePlate: vehiclePlate || null, phone: phone || null },
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
  })
  return reply.send({ success: true, data: driver })
}

export async function updateDriver(
  request: FastifyRequest<{ Params: { id: string }; Body: { vehiclePlate?: string; phone?: string; active?: boolean } }>,
  reply: FastifyReply
) {
  const { id } = request.params
  const data: any = {}
  if (request.body.vehiclePlate !== undefined) data.vehiclePlate = request.body.vehiclePlate
  if (request.body.phone !== undefined) data.phone = request.body.phone
  if (request.body.active !== undefined) data.active = request.body.active
  const driver = await request.server.prisma.driver.update({
    where: { id },
    data,
    include: { user: { select: { id: true, name: true, email: true, phone: true, role: true } } },
  })
  return reply.send({ success: true, data: driver })
}

// ─── READY orders for dispatch ─────────────────────────────
export async function listReadyOrders(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply
) {
  const start = startOfDayUTC(request.query.date)
  const end = endOfDayUTC(request.query.date)
  const orders = await request.server.prisma.order.findMany({
    where: {
      deliveryDate: { gte: start, lte: end },
      status: 'READY',
      deliveryStop: null,
    },
    include: {
      lines: { include: { stockItem: { select: { isPerishable: true } } } },
    },
    orderBy: [{ deliverySlot: 'asc' }, { createdAt: 'asc' }],
  })

  const shaped = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    deliveryAddress: o.deliveryAddress,
    deliverySlot: o.deliverySlot,
    total: Number(o.total),
    lineCount: o.lines.length,
    perishableCount: o.lines.filter((l) => l.stockItem?.isPerishable).length,
    status: o.status,
  }))

  const grouped: Record<string, typeof shaped> = { AM: [], PM: [] }
  for (const o of shaped) {
    if (!grouped[o.deliverySlot]) grouped[o.deliverySlot] = []
    grouped[o.deliverySlot].push(o)
  }
  return reply.send({ success: true, data: { orders: shaped, grouped } })
}

// ─── Trips ─────────────────────────────────────────────────
export async function createTrip(
  request: FastifyRequest<{ Body: { driverId: string; date: string; slot: string; orderIds: string[] } }>,
  reply: FastifyReply
) {
  const { driverId, date, slot, orderIds } = request.body || ({} as any)
  if (!driverId || !date || !slot || !Array.isArray(orderIds) || orderIds.length === 0) {
    return reply.status(400).send({ success: false, message: 'driverId, date, slot, orderIds required' })
  }
  if (!['AM', 'PM'].includes(slot)) {
    return reply.status(400).send({ success: false, message: 'slot must be AM or PM' })
  }
  const dateOnly = startOfDayUTC(date)

  const result = await request.server.prisma.$transaction(async (tx) => {
    // Verify driver
    const driver = await tx.driver.findUnique({ where: { id: driverId } })
    if (!driver) throw new Error('Driver not found')

    // Check existing trip
    let trip = await tx.deliveryTrip.findUnique({
      where: { driverId_date_slot: { driverId, date: dateOnly, slot } },
      include: { stops: true },
    })
    if (!trip) {
      trip = await tx.deliveryTrip.create({
        data: { driverId, date: dateOnly, slot, status: 'PLANNED' },
        include: { stops: true },
      })
    }

    let maxSeq = trip.stops.reduce((m, s) => Math.max(m, s.sequence), 0)

    for (const orderId of orderIds) {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { deliveryStop: true } })
      if (!order) continue
      if (order.deliveryStop) continue // already assigned
      if (order.status !== 'READY') continue

      maxSeq += 1
      await tx.deliveryStop.create({
        data: {
          tripId: trip.id,
          orderId: order.id,
          sequence: maxSeq,
          status: 'PENDING',
        },
      })
    }

    return tx.deliveryTrip.findUnique({
      where: { id: trip.id },
      include: {
        driver: { include: { user: { select: { id: true, name: true, email: true } } } },
        stops: {
          orderBy: { sequence: 'asc' },
          include: { order: true },
        },
      },
    })
  })

  return reply.send({ success: true, data: result })
}

export async function listTrips(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply
) {
  const start = startOfDayUTC(request.query.date)
  const end = endOfDayUTC(request.query.date)
  const trips = await request.server.prisma.deliveryTrip.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      driver: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          order: {
            select: {
              id: true, orderNumber: true, contactName: true, contactPhone: true,
              deliveryAddress: true, total: true, status: true,
            },
          },
        },
      },
    },
    orderBy: [{ slot: 'asc' }, { createdAt: 'asc' }],
  })

  const shaped = trips.map((t) => {
    const byStatus: Record<string, number> = {}
    for (const s of t.stops) byStatus[s.status] = (byStatus[s.status] || 0) + 1
    return {
      ...t,
      totalStops: t.stops.length,
      completedStops: t.stops.filter((s) => s.status === 'DELIVERED').length,
      statusCounts: byStatus,
    }
  })
  return reply.send({ success: true, data: shaped })
}

export async function getTripDetail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const trip = await request.server.prisma.deliveryTrip.findUnique({
    where: { id: request.params.id },
    include: {
      driver: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          order: {
            include: {
              lines: true,
            },
          },
        },
      },
    },
  })
  if (!trip) return reply.status(404).send({ success: false, message: 'Trip not found' })
  return reply.send({ success: true, data: trip })
}

export async function updateStopSequence(
  request: FastifyRequest<{ Params: { id: string }; Body: { sequence: number } }>,
  reply: FastifyReply
) {
  const { id } = request.params
  const { sequence } = request.body || ({} as any)
  if (typeof sequence !== 'number' || sequence < 1) {
    return reply.status(400).send({ success: false, message: 'sequence required' })
  }
  const stop = await request.server.prisma.deliveryStop.findUnique({ where: { id } })
  if (!stop) return reply.status(404).send({ success: false, message: 'Stop not found' })

  await request.server.prisma.$transaction(async (tx) => {
    const siblings = await tx.deliveryStop.findMany({
      where: { tripId: stop.tripId },
      orderBy: { sequence: 'asc' },
    })
    const reordered = siblings.filter((s) => s.id !== id)
    const insertIdx = Math.max(0, Math.min(sequence - 1, reordered.length))
    reordered.splice(insertIdx, 0, stop)
    for (let i = 0; i < reordered.length; i++) {
      await tx.deliveryStop.update({ where: { id: reordered[i].id }, data: { sequence: i + 1 } })
    }
  })
  return reply.send({ success: true })
}

export async function removeStop(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const stop = await request.server.prisma.deliveryStop.findUnique({ where: { id: request.params.id } })
  if (!stop) return reply.status(404).send({ success: false, message: 'Stop not found' })
  if (stop.status !== 'PENDING') {
    return reply.status(400).send({ success: false, message: 'Can only remove PENDING stops' })
  }
  await request.server.prisma.deliveryStop.delete({ where: { id: stop.id } })
  // Re-sequence
  const siblings = await request.server.prisma.deliveryStop.findMany({
    where: { tripId: stop.tripId },
    orderBy: { sequence: 'asc' },
  })
  for (let i = 0; i < siblings.length; i++) {
    await request.server.prisma.deliveryStop.update({ where: { id: siblings[i].id }, data: { sequence: i + 1 } })
  }
  return reply.send({ success: true })
}

export async function cancelTrip(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const tripId = request.params.id
  const trip = await request.server.prisma.deliveryTrip.findUnique({
    where: { id: tripId },
    include: { stops: true },
  })
  if (!trip) return reply.status(404).send({ success: false, message: 'Trip not found' })

  await request.server.prisma.$transaction(async (tx) => {
    await tx.deliveryTrip.update({
      where: { id: tripId },
      data: { status: 'CANCELLED' },
    })
    for (const s of trip.stops) {
      if (s.status === 'PENDING' || s.status === 'ARRIVED') {
        await tx.deliveryStop.update({ where: { id: s.id }, data: { status: 'SKIPPED' } })
        // Revert OUT_FOR_DELIVERY back to READY (if applicable)
        const ord = await tx.order.findUnique({ where: { id: s.orderId } })
        if (ord && ord.status === 'OUT_FOR_DELIVERY') {
          await tx.order.update({ where: { id: ord.id }, data: { status: 'READY' } })
          await tx.orderStatusLog.create({
            data: {
              orderId: ord.id, fromStatus: 'OUT_FOR_DELIVERY', toStatus: 'READY',
              changedById: user?.userId ?? null, note: 'Trip cancelled — reverted to READY',
            },
          })
        }
      }
    }
  })
  return reply.send({ success: true })
}

// ─── Driver endpoints ───────────────────────────────────────
function pickSlotByNow(): string {
  const h = new Date().getUTCHours() + 8 // rough MY time
  return h < 12 ? 'AM' : 'PM'
}

async function getMyDriver(request: FastifyRequest) {
  const user = request.user as any
  const driver = await request.server.prisma.driver.findUnique({
    where: { userId: user.userId },
  })
  return driver
}

export async function getMyTrip(
  request: FastifyRequest<{ Querystring: { date?: string; slot?: string } }>,
  reply: FastifyReply
) {
  const driver = await getMyDriver(request)
  if (!driver) return reply.status(404).send({ success: false, message: 'Driver profile not found' })
  const date = startOfDayUTC(request.query.date)
  const slot = request.query.slot || pickSlotByNow()

  const trip = await request.server.prisma.deliveryTrip.findFirst({
    where: { driverId: driver.id, date, slot },
    include: {
      stops: {
        orderBy: { sequence: 'asc' },
        include: {
          order: {
            include: { lines: true },
          },
        },
      },
    },
  })
  // Also fetch sibling trips (other slot)
  const allToday = await request.server.prisma.deliveryTrip.findMany({
    where: { driverId: driver.id, date },
    include: {
      stops: {
        orderBy: { sequence: 'asc' },
        include: { order: true },
      },
    },
    orderBy: { slot: 'asc' },
  })
  return reply.send({ success: true, data: { trip, trips: allToday } })
}

async function ensureTripBelongsToMe(request: FastifyRequest, tripId: string) {
  const driver = await getMyDriver(request)
  if (!driver) return null
  const trip = await request.server.prisma.deliveryTrip.findUnique({ where: { id: tripId } })
  if (!trip || trip.driverId !== driver.id) return null
  return trip
}

async function ensureStopBelongsToMe(request: FastifyRequest, stopId: string) {
  const driver = await getMyDriver(request)
  if (!driver) return null
  const stop = await request.server.prisma.deliveryStop.findUnique({
    where: { id: stopId },
    include: { trip: true },
  })
  if (!stop || stop.trip.driverId !== driver.id) return null
  return stop
}

export async function startMyTrip(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const trip = await ensureTripBelongsToMe(request, request.params.id)
  if (!trip) return reply.status(404).send({ success: false, message: 'Trip not found' })
  if (trip.status !== 'PLANNED') {
    return reply.status(400).send({ success: false, message: 'Trip already started' })
  }

  await request.server.prisma.$transaction(async (tx) => {
    await tx.deliveryTrip.update({
      where: { id: trip.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    })
    const stops = await tx.deliveryStop.findMany({ where: { tripId: trip.id } })
    for (const s of stops) {
      const ord = await tx.order.findUnique({ where: { id: s.orderId } })
      if (ord && ord.status === 'READY') {
        await tx.order.update({ where: { id: ord.id }, data: { status: 'OUT_FOR_DELIVERY' } })
        await tx.orderStatusLog.create({
          data: {
            orderId: ord.id, fromStatus: 'READY', toStatus: 'OUT_FOR_DELIVERY',
            changedById: user?.userId ?? null, note: 'Trip started',
          },
        })
      }
    }
  })
  return reply.send({ success: true })
}

export async function markStopArrived(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const stop = await ensureStopBelongsToMe(request, request.params.id)
  if (!stop) return reply.status(404).send({ success: false, message: 'Stop not found' })
  await request.server.prisma.deliveryStop.update({
    where: { id: stop.id },
    data: { status: 'ARRIVED', arrivedAt: new Date() },
  })
  return reply.send({ success: true })
}

const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2MB

function estimateDataUrlSize(s: string | undefined | null): number {
  if (!s) return 0
  // base64 string length * 3/4 roughly
  const comma = s.indexOf(',')
  const b64 = comma >= 0 ? s.slice(comma + 1) : s
  return Math.floor(b64.length * 0.75)
}

async function maybeCompleteTrip(tx: any, tripId: string) {
  const stops = await tx.deliveryStop.findMany({ where: { tripId } })
  const terminal: StopStatus[] = ['DELIVERED', 'FAILED', 'SKIPPED']
  const allTerminal = stops.length > 0 && stops.every((s: any) => terminal.includes(s.status))
  if (allTerminal) {
    const trip = await tx.deliveryTrip.findUnique({ where: { id: tripId } })
    if (trip && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED') {
      await tx.deliveryTrip.update({
        where: { id: tripId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    }
  }
}

export async function markStopDelivered(
  request: FastifyRequest<{
    Params: { id: string }
    Body: { receivedByName: string; signatureDataUrl: string; proofPhotoUrl?: string; notes?: string }
  }>,
  reply: FastifyReply
) {
  const user = request.user as any
  const { receivedByName, signatureDataUrl, proofPhotoUrl, notes } = request.body || ({} as any)
  if (!receivedByName || !signatureDataUrl) {
    return reply.status(400).send({ success: false, message: 'receivedByName and signatureDataUrl required' })
  }
  if (estimateDataUrlSize(proofPhotoUrl) > MAX_PHOTO_BYTES) {
    return reply.status(413).send({ success: false, message: 'Photo exceeds 2MB limit' })
  }
  if (estimateDataUrlSize(signatureDataUrl) > MAX_PHOTO_BYTES) {
    return reply.status(413).send({ success: false, message: 'Signature too large' })
  }

  const stop = await ensureStopBelongsToMe(request, request.params.id)
  if (!stop) return reply.status(404).send({ success: false, message: 'Stop not found' })

  let autoInvoice: { documentId: string; documentNumber: string } | null = null

  await request.server.prisma.$transaction(async (tx) => {
    await tx.deliveryStop.update({
      where: { id: stop.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        receivedByName,
        signatureDataUrl,
        proofPhotoUrl: proofPhotoUrl || null,
        notes: notes || null,
      },
    })
    const ord = await tx.order.findUnique({ where: { id: stop.orderId } })
    if (ord && ord.status === 'OUT_FOR_DELIVERY') {
      await tx.order.update({ where: { id: ord.id }, data: { status: 'DELIVERED' } })
      await tx.orderStatusLog.create({
        data: {
          orderId: ord.id, fromStatus: 'OUT_FOR_DELIVERY', toStatus: 'DELIVERED',
          changedById: user?.userId ?? null, note: `Delivered — received by ${receivedByName}`,
        },
      })

      // Auto-generate invoice if configured
      try {
        const setting = await tx.setting.findUnique({ where: { key: 'invoice.autoGenerateOnDelivered' } })
        const enabled = !setting || setting.value === 'true' || setting.value === '1'
        if (enabled && !ord.invoiceId) {
          const branch = await tx.user.findUnique({ where: { id: user?.userId }, select: { branchId: true } })
          if (branch) {
            const res = await generateInvoiceFromOrder(tx as any, {
              branchId: branch.branchId,
              orderId: ord.id,
              createdById: user.userId,
            })
            autoInvoice = { documentId: res.documentId, documentNumber: res.documentNumber }
          }
        }
      } catch (err: any) {
        request.log.error({ err, orderId: ord.id }, 'Auto invoice generation failed — continuing')
      }
    }
    await maybeCompleteTrip(tx, stop.tripId)
  })
  return reply.send({ success: true, data: autoInvoice ? { autoInvoice } : undefined })
}

export async function markStopFailed(
  request: FastifyRequest<{ Params: { id: string }; Body: { failureReason: string; notes?: string } }>,
  reply: FastifyReply
) {
  const { failureReason, notes } = request.body || ({} as any)
  if (!failureReason) return reply.status(400).send({ success: false, message: 'failureReason required' })
  const stop = await ensureStopBelongsToMe(request, request.params.id)
  if (!stop) return reply.status(404).send({ success: false, message: 'Stop not found' })

  await request.server.prisma.$transaction(async (tx) => {
    await tx.deliveryStop.update({
      where: { id: stop.id },
      data: { status: 'FAILED', failureReason, notes: notes || null },
    })
    await maybeCompleteTrip(tx, stop.tripId)
  })
  return reply.send({ success: true })
}

export async function markStopSkipped(
  request: FastifyRequest<{ Params: { id: string }; Body: { notes?: string } }>,
  reply: FastifyReply
) {
  const stop = await ensureStopBelongsToMe(request, request.params.id)
  if (!stop) return reply.status(404).send({ success: false, message: 'Stop not found' })
  await request.server.prisma.$transaction(async (tx) => {
    await tx.deliveryStop.update({
      where: { id: stop.id },
      data: { status: 'SKIPPED', notes: request.body?.notes || null },
    })
    await maybeCompleteTrip(tx, stop.tripId)
  })
  return reply.send({ success: true })
}

// ─── Alerts ─────────────────────────────────────────────────
async function getSettingTime(prisma: any, key: string, fallback: string): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } })
  return s?.value || fallback
}

export async function getAlerts(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply
) {
  const start = startOfDayUTC(request.query.date)
  const end = endOfDayUTC(request.query.date)
  const now = new Date()

  const amEnd = await getSettingTime(request.server.prisma, 'delivery.am.endTime', '12:00')
  const pmEnd = await getSettingTime(request.server.prisma, 'delivery.pm.endTime', '18:00')

  function cutoffDate(slot: string): Date {
    const hhmm = slot === 'AM' ? amEnd : pmEnd
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10))
    // Interpret as local MY time (UTC+8) → subtract 8 to get UTC hours
    const d = new Date(start)
    d.setUTCHours(h - 8, m || 0, 0, 0)
    return d
  }

  // Unassigned: READY orders with no stop
  const readyOrders = await request.server.prisma.order.findMany({
    where: {
      deliveryDate: { gte: start, lte: end },
      status: 'READY',
      deliveryStop: null,
    },
    select: {
      id: true, orderNumber: true, contactName: true, deliverySlot: true, updatedAt: true,
    },
  })
  const unassigned = readyOrders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    contactName: o.contactName,
    slot: o.deliverySlot,
    minutesSinceReady: Math.max(0, Math.floor((now.getTime() - new Date(o.updatedAt).getTime()) / 60000)),
  }))

  // Overdue stops
  const stops = await request.server.prisma.deliveryStop.findMany({
    where: {
      trip: { date: { gte: start, lte: end } },
      status: { notIn: ['DELIVERED', 'SKIPPED', 'FAILED'] },
    },
    include: {
      trip: { select: { slot: true, driverId: true } },
      order: { select: { orderNumber: true, contactName: true } },
    },
  })
  const overdue = stops
    .filter((s) => now > cutoffDate(s.trip.slot))
    .map((s) => ({
      stopId: s.id,
      orderNumber: s.order.orderNumber,
      contactName: s.order.contactName,
      slot: s.trip.slot,
      status: s.status,
      minutesOverdue: Math.floor((now.getTime() - cutoffDate(s.trip.slot).getTime()) / 60000),
    }))

  const failedStops = await request.server.prisma.deliveryStop.findMany({
    where: {
      trip: { date: { gte: start, lte: end } },
      status: 'FAILED',
    },
    include: {
      trip: { select: { slot: true } },
      order: { select: { orderNumber: true, contactName: true } },
    },
  })
  const failed = failedStops.map((s) => ({
    stopId: s.id,
    orderNumber: s.order.orderNumber,
    contactName: s.order.contactName,
    slot: s.trip.slot,
    failureReason: s.failureReason,
  }))

  return reply.send({ success: true, data: { unassigned, overdue, failed } })
}
