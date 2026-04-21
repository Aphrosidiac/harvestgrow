import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { hashPassword, verifyPassword } from '../../utils/password.js'
import { Prisma } from '@prisma/client'

// ─── helpers ───────────────────────────────────────────────

async function getSetting(prisma: any, key: string, fallback: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } })
  return row?.value ?? fallback
}

function toMalaysiaIsoParts(date: Date) {
  // Malaysia = UTC+8, no DST
  const ms = date.getTime() + 8 * 3600 * 1000
  const d = new Date(ms)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return { yyyy, mm, dd, hh, mi, ymd: `${yyyy}-${mm}-${dd}`, yy: String(yyyy).slice(2) }
}

function parseCutoffAt(cutoffTime: string, offsetDays = 0): Date {
  // cutoffTime = "HH:MM" in Malaysia time. Returns UTC Date.
  const now = new Date()
  const { yyyy, mm, dd } = toMalaysiaIsoParts(now)
  const [h, m] = cutoffTime.split(':').map((x) => parseInt(x, 10))
  // Build UTC time: MY H:M minus 8hrs
  const base = Date.UTC(yyyy, Number(mm) - 1, Number(dd) + offsetDays, h - 8, m, 0)
  return new Date(base)
}

async function computeCutoff(prisma: any) {
  const cutoffTime = await getSetting(prisma, 'shop.delivery.cutoffTime', '14:00')
  const now = new Date()
  const todayCutoff = parseCutoffAt(cutoffTime, 0)
  const isPastCutoff = now.getTime() > todayCutoff.getTime()
  const delivery = isPastCutoff
    ? new Date(todayCutoff.getTime() + 24 * 3600 * 1000)
    : todayCutoff
  const { ymd } = toMalaysiaIsoParts(delivery)
  return { cutoffTime, todayCutoff, isPastCutoff, nextDeliveryDate: ymd }
}

// ─── public browse ─────────────────────────────────────────

export async function getCategories(request: FastifyRequest, reply: FastifyReply) {
  const categories = await request.server.prisma.stockCategory.findMany({
    include: {
      _count: {
        select: { items: { where: { isActive: true, quantity: { gt: 0 } } } },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })
  const filtered = categories
    .filter((c: any) => c._count.items > 0)
    .map((c: any) => ({ id: c.id, name: c.name, code: c.code, productCount: c._count.items }))
  return reply.send({ success: true, data: filtered })
}

export async function getProducts(
  request: FastifyRequest<{ Querystring: { categoryId?: string; search?: string } }>,
  reply: FastifyReply
) {
  const { categoryId, search } = request.query
  const where: Prisma.StockItemWhereInput = {
    isActive: true,
    quantity: { gt: 0 },
    ...(categoryId && { categoryId }),
    ...(search && {
      description: { contains: search, mode: 'insensitive' },
    }),
  }
  const items = await request.server.prisma.stockItem.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
    orderBy: { description: 'asc' },
  })
  const data = items.map((p) => ({
    id: p.id,
    name: p.description,
    description: p.description,
    imageUrl: p.imageUrl,
    sellPrice: Number(p.sellPrice),
    previousPrice: p.previousPrice ? Number(p.previousPrice) : null,
    unit: p.uom,
    cutOptions: p.cutOptions ? safeJsonArray(p.cutOptions) : [],
    isPerishable: p.isPerishable,
    shelfLifeDays: p.shelfLifeDays,
    category: p.category,
  }))
  return reply.send({ success: true, data })
}

function safeJsonArray(s: string): string[] {
  try {
    const arr = JSON.parse(s)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export async function getProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const item = await request.server.prisma.stockItem.findFirst({
    where: { id: request.params.id, isActive: true },
    include: { category: { select: { id: true, name: true } } },
  })
  if (!item) return reply.status(404).send({ success: false, message: 'Product not found' })
  return reply.send({
    success: true,
    data: {
      id: item.id,
      name: item.description,
      description: item.description,
      imageUrl: item.imageUrl,
      sellPrice: Number(item.sellPrice),
      previousPrice: item.previousPrice ? Number(item.previousPrice) : null,
      unit: item.uom,
      cutOptions: item.cutOptions ? safeJsonArray(item.cutOptions) : [],
      isPerishable: item.isPerishable,
      shelfLifeDays: item.shelfLifeDays,
      category: item.category,
      inStock: item.quantity > 0,
    },
  })
}

export async function getCutoff(request: FastifyRequest, reply: FastifyReply) {
  const c = await computeCutoff(request.server.prisma)
  return reply.send({
    success: true,
    data: {
      cutoffTime: c.cutoffTime,
      todayCutoff: c.todayCutoff.toISOString(),
      isPastCutoff: c.isPastCutoff,
      nextDeliveryDate: c.nextDeliveryDate,
    },
  })
}

// ─── price-check ──────────────────────────────────────────
const priceCheckSchema = z.object({
  lines: z.array(z.object({
    stockItemId: z.string().min(1),
    clientUnitPrice: z.number(),
  })).min(1),
})

export async function priceCheck(request: FastifyRequest, reply: FastifyReply) {
  const parse = priceCheckSchema.safeParse(request.body)
  if (!parse.success) return reply.status(400).send({ success: false, message: 'Invalid payload' })
  const { lines } = parse.data
  const items = await request.server.prisma.stockItem.findMany({
    where: { id: { in: lines.map((l) => l.stockItemId) } },
    select: { id: true, description: true, sellPrice: true },
  })
  const itemMap = new Map(items.map((i: any) => [i.id, i]))
  const changed: Array<{ stockItemId: string; itemName: string; oldPrice: number; newPrice: number }> = []
  let unchanged = 0
  for (const l of lines) {
    const it: any = itemMap.get(l.stockItemId)
    if (!it) continue
    const newPrice = Number(it.sellPrice)
    if (Math.abs(newPrice - l.clientUnitPrice) > 0.005) {
      changed.push({ stockItemId: l.stockItemId, itemName: it.description, oldPrice: l.clientUnitPrice, newPrice })
    } else { unchanged++ }
  }
  return reply.send({ success: true, data: { changed, unchanged } })
}

// ─── create order ──────────────────────────────────────────

const createOrderSchema = z.object({
  contact: z.object({
    name: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email().optional(),
  }),
  deliveryAddress: z.string().min(3),
  deliveryPostcode: z.string().optional(),
  deliverySlot: z.enum(['AM', 'PM']),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        stockItemId: z.string().min(1),
        quantity: z.number().positive(),
        cutStyle: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1),
  createAccount: z
    .object({ password: z.string().min(6) })
    .optional(),
})

export async function createOrder(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const parse = createOrderSchema.safeParse(request.body)
  if (!parse.success) {
    return reply.status(400).send({ success: false, message: 'Invalid payload', errors: parse.error.flatten() })
  }
  const body = parse.data
  const prisma = request.server.prisma

  const cutoff = await computeCutoff(prisma)
  const deliveryDate = new Date(cutoff.nextDeliveryDate + 'T00:00:00.000Z')
  const deliveryFee = Number(await getSetting(prisma, 'shop.delivery.fee', '0'))
  const minOrderAmount = Number(await getSetting(prisma, 'shop.minOrderAmount', '0'))
  const serviceablePostcodesRaw = await getSetting(prisma, 'shop.serviceable.postcodes', '')
  const serviceablePostcodes = serviceablePostcodesRaw.split(',').map((s) => s.trim()).filter(Boolean)

  // Validate postcode
  if (serviceablePostcodes.length > 0 && body.deliveryPostcode) {
    if (!serviceablePostcodes.includes(body.deliveryPostcode.trim())) {
      return reply.status(400).send({ success: false, error: 'AREA_NOT_SERVICEABLE', message: `We don't deliver to ${body.deliveryPostcode} yet.` })
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Validate stock items
      const itemIds = body.lines.map((l) => l.stockItemId)
      const items = await tx.stockItem.findMany({ where: { id: { in: itemIds }, isActive: true } })
      const itemMap = new Map(items.map((i) => [i.id, i]))

      let subtotal = 0
      const lineData: any[] = []

      for (const l of body.lines) {
        const it = itemMap.get(l.stockItemId)
        if (!it) throw new Error(`Product not found: ${l.stockItemId}`)
        if (it.quantity <= 0) throw new Error(`Out of stock: ${it.description}`)
        const unitPrice = Number(it.sellPrice)
        const lineTotal = Number((unitPrice * l.quantity).toFixed(2))
        subtotal += lineTotal
        lineData.push({
          stockItemId: it.id,
          itemName: it.description,
          unit: it.uom,
          quantity: l.quantity,
          unitPrice,
          cutStyle: l.cutStyle || null,
          notes: l.notes || null,
          lineTotal,
        })
      }
      subtotal = Number(subtotal.toFixed(2))
      if (minOrderAmount > 0 && subtotal < minOrderAmount) {
        const err: any = new Error(`Minimum order is RM ${minOrderAmount.toFixed(2)}`)
        err.code = 'BELOW_MINIMUM'
        err.minimum = minOrderAmount
        err.subtotal = subtotal
        throw err
      }
      const total = Number((subtotal + deliveryFee).toFixed(2))

      // Find/create ShopCustomer
      let customer = await tx.shopCustomer.findUnique({ where: { phone: body.contact.phone } })
      if (!customer) {
        customer = await tx.shopCustomer.create({
          data: {
            name: body.contact.name,
            phone: body.contact.phone,
            email: body.contact.email,
            address: body.deliveryAddress,
            passwordHash: body.createAccount ? await hashPassword(body.createAccount.password) : null,
          },
        })
      } else if (body.createAccount && !customer.passwordHash) {
        customer = await tx.shopCustomer.update({
          where: { id: customer.id },
          data: { passwordHash: await hashPassword(body.createAccount.password) },
        })
      }

      // Generate order number HG-YYMMDD-####
      const { yy, mm, dd } = toMalaysiaIsoParts(deliveryDate)
      const dateKey = `${yy}${mm}${dd}`
      const counterKey = `shop.order.counter.${dateKey}`
      const existing = await tx.setting.findUnique({ where: { key: counterKey } })
      const nextSeq = existing ? parseInt(existing.value, 10) + 1 : 1
      await tx.setting.upsert({
        where: { key: counterKey },
        update: { value: String(nextSeq) },
        create: { key: counterKey, value: String(nextSeq) },
      })
      const orderNumber = `HG-${dateKey}-${String(nextSeq).padStart(4, '0')}`

      // Decrement stock
      for (const l of body.lines) {
        const it = itemMap.get(l.stockItemId)!
        const newQty = Math.max(0, it.quantity - Math.ceil(l.quantity))
        await tx.stockItem.update({ where: { id: it.id }, data: { quantity: newQty } })
      }

      const order = await tx.order.create({
        data: {
          orderNumber,
          shopCustomerId: customer.id,
          contactName: body.contact.name,
          contactPhone: body.contact.phone,
          contactEmail: body.contact.email,
          deliveryAddress: body.deliveryAddress,
          deliveryPostcode: body.deliveryPostcode || null,
          deliveryDate,
          deliverySlot: body.deliverySlot,
          notes: body.notes,
          subtotal,
          deliveryFee,
          total,
          lines: { create: lineData },
        },
      })

      return { order, customer }
    })

    return reply.status(201).send({
      success: true,
      data: {
        orderId: result.order.id,
        orderNumber: result.order.orderNumber,
        total: Number(result.order.total),
        deliveryDate: result.order.deliveryDate.toISOString(),
        deliverySlot: result.order.deliverySlot,
        status: result.order.status,
      },
    })
  } catch (err: any) {
    request.log.error({ err }, 'createOrder failed')
    if (err.code === 'BELOW_MINIMUM') {
      return reply.status(400).send({ success: false, error: 'BELOW_MINIMUM', minimum: err.minimum, subtotal: err.subtotal, message: err.message })
    }
    return reply.status(400).send({ success: false, message: err.message || 'Order failed' })
  }
}

// ─── shop customer: my orders ─────────────────────────────
export async function shopMyOrders(request: FastifyRequest, reply: FastifyReply) {
  const { userId, role } = request.user as any
  if (role !== 'SHOP_CUSTOMER') return reply.status(401).send({ success: false, message: 'Unauthorized' })
  const orders = await request.server.prisma.order.findMany({
    where: { shopCustomerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { lines: true },
  })
  return reply.send({ success: true, data: orders })
}

export async function getOrderInvoice(
  request: FastifyRequest<{ Params: { orderNumber: string }; Querystring: { phone?: string } }>,
  reply: FastifyReply
) {
  const { orderNumber } = request.params
  const { phone } = request.query
  if (!phone) return reply.status(400).send({ success: false, message: 'Phone required' })

  const order = await request.server.prisma.order.findUnique({
    where: { orderNumber },
    include: { invoice: { include: { items: { orderBy: { sortOrder: 'asc' } } } } },
  })
  if (!order || order.contactPhone !== phone) {
    return reply.status(404).send({ success: false, message: 'Order not found' })
  }
  if (!order.invoice) {
    return reply.status(404).send({ success: false, message: 'Invoice not yet generated' })
  }
  return reply.send({ success: true, data: order.invoice })
}

export async function trackOrder(
  request: FastifyRequest<{ Params: { orderNumber: string }; Querystring: { phone?: string } }>,
  reply: FastifyReply
) {
  const { orderNumber } = request.params
  const { phone } = request.query
  if (!phone) return reply.status(400).send({ success: false, message: 'Phone required' })

  const order = await request.server.prisma.order.findUnique({
    where: { orderNumber },
    include: {
      lines: true,
      invoice: { select: { id: true, documentNumber: true, status: true, totalAmount: true } },
    },
  })
  if (!order || order.contactPhone !== phone) {
    return reply.status(404).send({ success: false, message: 'Order not found' })
  }
  return reply.send({ success: true, data: order })
}

// ─── shop customer auth ────────────────────────────────────

export async function shopLogin(
  request: FastifyRequest<{ Body: { phone: string; password: string } }>,
  reply: FastifyReply
) {
  const { phone, password } = request.body || ({} as any)
  if (!phone || !password) return reply.status(400).send({ success: false, message: 'Phone and password required' })
  const customer = await request.server.prisma.shopCustomer.findUnique({ where: { phone } })
  if (!customer || !customer.passwordHash) return reply.status(401).send({ success: false, message: 'Invalid credentials' })
  const ok = await verifyPassword(password, customer.passwordHash)
  if (!ok) return reply.status(401).send({ success: false, message: 'Invalid credentials' })
  const token = request.server.jwt.sign({ userId: customer.id, branchId: 'shop', role: 'SHOP_CUSTOMER' })
  return reply.send({
    success: true,
    data: {
      token,
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
    },
  })
}

export async function shopMe(request: FastifyRequest, reply: FastifyReply) {
  const { userId, role } = request.user as any
  if (role !== 'SHOP_CUSTOMER') return reply.status(401).send({ success: false, message: 'Unauthorized' })
  const customer = await request.server.prisma.shopCustomer.findUnique({
    where: { id: userId },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { lines: true },
      },
    },
  })
  if (!customer) return reply.status(404).send({ success: false, message: 'Not found' })
  const { passwordHash: _ph, ...safe } = customer as any
  return reply.send({ success: true, data: safe })
}
