import { FastifyRequest, FastifyReply } from 'fastify'

export async function listDebtors(
  request: FastifyRequest<{ Querystring: Record<string, any> }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { from, to, search } = request.query as any

  // Query unpaid invoices directly — don't rely on customerId relation
  const unpaidInvoices = await request.server.prisma.document.findMany({
    where: {
      branchId,
      documentType: 'INVOICE',
      status: { in: ['OUTSTANDING', 'PARTIAL', 'OVERDUE'] },
      ...(from || to ? {
        issueDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
        },
      } : {}),
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerCompanyName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { vehiclePlate: { contains: search, mode: 'insensitive' } },
          { documentNumber: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: {
      id: true,
      documentNumber: true,
      customerName: true,
      customerPhone: true,
      vehiclePlate: true,
      totalAmount: true,
      paidAmount: true,
      status: true,
      issueDate: true,
      dueDate: true,
      customerId: true,
    },
    orderBy: { issueDate: 'desc' },
  })

  // Group by customer (use customerId if available, otherwise customerName+customerPhone)
  const grouped = new Map<string, {
    key: string
    customerId: string | null
    name: string
    phone: string | null
    plate: string | null
    documents: typeof unpaidInvoices
  }>()

  for (const inv of unpaidInvoices) {
    const key = inv.customerId || `${inv.customerName || ''}::${inv.customerPhone || ''}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        customerId: inv.customerId,
        name: inv.customerName || 'Unknown',
        phone: inv.customerPhone,
        plate: inv.vehiclePlate,
        documents: [],
      })
    }
    grouped.get(key)!.documents.push(inv)
    // Keep the latest plate visible
    if (inv.vehiclePlate && !grouped.get(key)!.plate) {
      grouped.get(key)!.plate = inv.vehiclePlate
    }
  }

  const data = Array.from(grouped.values()).map((d) => {
    const totalOwed = d.documents.reduce(
      (sum, doc) => sum + (doc.totalAmount.toNumber() - doc.paidAmount.toNumber()),
      0
    )
    const oldestDueDate = d.documents
      .filter((doc) => doc.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0]?.dueDate || null
    const latestIssueDate = d.documents[0]?.issueDate || null

    return {
      id: d.customerId || d.key,
      name: d.name,
      phone: d.phone,
      plate: d.plate,
      invoiceCount: d.documents.length,
      totalOwed: Math.round(totalOwed * 100) / 100,
      oldestDueDate,
      latestIssueDate,
      documents: d.documents.map((doc) => ({
        id: doc.id,
        documentNumber: doc.documentNumber,
        totalAmount: doc.totalAmount.toNumber(),
        paidAmount: doc.paidAmount.toNumber(),
        balance: Math.round((doc.totalAmount.toNumber() - doc.paidAmount.toNumber()) * 100) / 100,
        status: doc.status,
        issueDate: doc.issueDate,
        dueDate: doc.dueDate,
        vehiclePlate: doc.vehiclePlate,
      })),
    }
  })

  // Sort by total owed descending
  data.sort((a, b) => b.totalOwed - a.totalOwed)

  return reply.send({ success: true, data })
}

export async function getDebtorDetail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { branchId } = request.user
  const { id } = request.params

  // Try by customerId first
  let invoices = await request.server.prisma.document.findMany({
    where: {
      branchId,
      customerId: id,
      documentType: 'INVOICE',
      status: { in: ['OUTSTANDING', 'PARTIAL', 'OVERDUE'] },
    },
    include: {
      payments: {
        include: { createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { issueDate: 'desc' },
  })

  // If no results, the id might be a composite key (name::phone) — try matching by snapshot
  if (invoices.length === 0 && id.includes('::')) {
    const [name, phone] = id.split('::')
    invoices = await request.server.prisma.document.findMany({
      where: {
        branchId,
        documentType: 'INVOICE',
        status: { in: ['OUTSTANDING', 'PARTIAL', 'OVERDUE'] },
        ...(name && { customerName: name }),
        ...(phone && { customerPhone: phone }),
      },
      include: {
        payments: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { issueDate: 'desc' },
    })
  }

  if (invoices.length === 0) {
    return reply.status(404).send({ success: false, message: 'No outstanding invoices found' })
  }

  const first = invoices[0]
  const totalOwed = invoices.reduce(
    (sum, doc) => sum + (doc.totalAmount.toNumber() - doc.paidAmount.toNumber()),
    0
  )

  return reply.send({
    success: true,
    data: {
      id,
      name: first.customerName || 'Unknown',
      phone: first.customerPhone,
      totalOwed: Math.round(totalOwed * 100) / 100,
      documents: invoices,
    },
  })
}
