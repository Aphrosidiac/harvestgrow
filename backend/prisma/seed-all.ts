import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding all new modules...\n')

  const branch = await prisma.branch.findFirstOrThrow({ where: { code: 'HG-JB' } })
  const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@harvestgrow-veg.com' } })
  const branchId = branch.id
  const adminId = admin.id

  // Update admin user with userGroup
  await prisma.user.update({ where: { id: adminId }, data: { username: 'superadmin', userGroup: 'SUPER_ADMIN' } })

  // Create additional staff users with userGroups
  const staffUsers = [
    { email: 'boss@harvestgrow-veg.com', name: 'Tan Ah Kow', username: 'boss', role: 'MANAGER' as const, userGroup: 'BOSS' as const, phone: '+607-222 3333', jobTitle: 'Managing Director' },
    { email: 'admin2@harvestgrow-veg.com', name: 'Lee Mei Ling', username: 'adminlee', role: 'ADMIN' as const, userGroup: 'ADMIN' as const, phone: '+607-333 4444', jobTitle: 'Office Admin' },
    { email: 'inventory@harvestgrow-veg.com', name: 'Muthu Kumar', username: 'muthu', role: 'MANAGER' as const, userGroup: 'INVENTORY_MANAGER' as const, phone: '+607-444 5555', jobTitle: 'Inventory Manager' },
  ]
  for (const u of staffUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { username: u.username, userGroup: u.userGroup },
      create: { branchId, email: u.email, name: u.name, username: u.username, passwordHash: '$2a$12$LJ3KxOvz7qvVJBqZQgF8/.6FxLlK0n3x3X5Q9v6YRBe3r0GkWJW2q', role: u.role, userGroup: u.userGroup, phone: u.phone, jobTitle: u.jobTitle },
    })
  }
  console.log('✓ Staff users with user groups')

  // ─── CUSTOMER GROUPS ────────────────────────────────────
  const customerGroups = [
    { name: 'MUSTAFA', term: 7, country: 'Singapore', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'MUSTAFA Standard', custValidation: 'UPDATE ON NEXT MONDAY' },
    { name: 'SCHOLAR DELIGHTS', term: 30, country: 'Singapore', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'SCHOLAR Normal', custValidation: 'UPDATE ON NEXT MONTH' },
    { name: 'SUPREMETASTES', term: 7, country: 'Singapore', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'SUPREMETASTES QUO', custValidation: 'UPDATE ON NEXT MONDAY' },
    { name: 'CHARCOAL MASTER', term: 7, country: 'Malaysia', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'MINI MARKET (Malaysia)', custValidation: 'UPDATE ON NEXT MONDAY' },
    { name: 'SG MINI MARKET', term: 3, country: 'Singapore', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'SG MINI (Normal)', custValidation: 'UPDATE ON EVERY Thu & Mon' },
    { name: 'HOSPITAL', term: 30, country: 'Malaysia', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'PR (Standard/Large)', custValidation: 'UPDATE ON NEXT MONTH' },
    { name: 'MASTER ANP', term: 7, country: 'Malaysia', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'MASTER ANP Normal', custValidation: 'UPDATE ON NEXT MONDAY' },
    { name: 'TS FOOD', term: 7, country: 'Malaysia', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'TS FOOD (Normal)', custValidation: 'UPDATE ON NEXT MONDAY' },
    { name: 'AEON', term: 30, country: 'Malaysia', priceType: 'Fixed Price', method: 'Fixed', value: 0, quotationTemplate: 'AEON JUSCO (Normal)', custValidation: 'UPDATE ON NEXT MONTH' },
  ]

  const cgMap: Record<string, string> = {}
  for (const cg of customerGroups) {
    const rec = await prisma.customerGroup.upsert({
      where: { branchId_name: { branchId, name: cg.name } },
      update: { term: cg.term, country: cg.country, priceType: cg.priceType, method: cg.method, value: cg.value, quotationTemplate: cg.quotationTemplate, custValidation: cg.custValidation },
      create: { branchId, ...cg },
    })
    cgMap[cg.name] = rec.id
  }
  console.log(`✓ ${customerGroups.length} customer groups`)

  // ─── CUSTOMERS (extended fields) ────────────────────────
  const customers = [
    { name: 'EDSAM TRADING SDN BHD', companyName: 'EDSAM TRADING SDN BHD', companyCode: '300-E0001', phone: '+607-351 2288', email: 'edsam@edsam.com', country: 'Malaysia', branchLocation: 'DANGA BAY', branchCode: 'DB', creditTerms: '7 Days', customerGroupId: cgMap['MASTER ANP'], address: '12 Jalan Danga Bay, 80200 Johor Bahru' },
    { name: 'EDSAM TRADING (KJ)', companyName: 'EDSAM TRADING SDN BHD', companyCode: '300-E0001', phone: '+607-351 2289', country: 'Malaysia', branchLocation: 'KULAI JAYA', branchCode: 'KJ', creditTerms: '7 Days', customerGroupId: cgMap['MASTER ANP'], address: 'Lot 8, Jalan Indahpura, Kulai' },
    { name: 'EDSAM TRADING (BDO)', companyName: 'EDSAM TRADING SDN BHD', companyCode: '300-E0001', phone: '+607-351 2290', country: 'Malaysia', branchLocation: 'BANDAR DATO ONN', branchCode: 'BDO', creditTerms: '7 Days', customerGroupId: cgMap['MASTER ANP'], address: '3 Jalan Dato Onn, JB' },
    { name: 'EDSAM TRADING (BI)', companyName: 'EDSAM TRADING SDN BHD', companyCode: '300-E0001', phone: '+607-351 2291', country: 'Malaysia', branchLocation: 'BUKIT INDAH', branchCode: 'BI', creditTerms: '7 Days', customerGroupId: cgMap['MASTER ANP'], address: '28 Jalan Indah, Bukit Indah' },
    { name: 'MUSTAFA CENTRE', companyName: 'MUSTAFA CENTRE PTE LTD', companyCode: '400-M0010', phone: '+65-6295 5855', country: 'Singapore', branchLocation: 'LITTLE INDIA', branchCode: 'LI', creditTerms: '7 Days', customerGroupId: cgMap['MUSTAFA'] },
    { name: 'AEON JUSCO TEBRAU', companyName: 'AEON CO. (M) BHD', companyCode: '300-A0001', phone: '+607-355 2233', country: 'Malaysia', branchLocation: 'TEBRAU CITY', branchCode: 'TC', creditTerms: '30 Days', customerGroupId: cgMap['AEON'] },
    { name: 'HOSPITAL SULTANAH AMINAH', companyName: 'HSA JB', companyCode: '300-H0001', phone: '+607-223 1666', country: 'Malaysia', branchLocation: 'JB TOWN', branchCode: 'JB', creditTerms: '30 Days', customerGroupId: cgMap['HOSPITAL'] },
    { name: 'SG MINI MART', companyName: 'SG MINI MART PTE LTD', companyCode: '400-S0005', phone: '+65-6333 4444', country: 'Singapore', branchLocation: 'WOODLANDS', branchCode: 'WD', creditTerms: '3 Days', customerGroupId: cgMap['SG MINI MARKET'] },
    { name: 'SCHOLAR DELIGHTS CATERING', companyName: 'SCHOLAR DELIGHTS PTE LTD', companyCode: '400-S0020', phone: '+65-6888 9999', country: 'Singapore', branchLocation: 'JURONG', branchCode: 'JR', creditTerms: '30 Days', customerGroupId: cgMap['SCHOLAR DELIGHTS'] },
    { name: 'TS FOOD INDUSTRIES', companyName: 'TS FOOD INDUSTRIES SDN BHD', companyCode: '300-T0003', phone: '+607-555 6666', country: 'Malaysia', branchLocation: 'SENAI', branchCode: 'SN', creditTerms: '7 Days', customerGroupId: cgMap['TS FOOD'] },
  ]

  const customerIds: string[] = []
  for (const c of customers) {
    const rec = await prisma.customer.upsert({
      where: { id: (await prisma.customer.findFirst({ where: { branchId, name: c.name } }))?.id || 'x' },
      update: { companyCode: c.companyCode, branchLocation: c.branchLocation, branchCode: c.branchCode, country: c.country, creditTerms: c.creditTerms, customerGroupId: c.customerGroupId },
      create: { branchId, ...c },
    }).catch(async () => {
      return prisma.customer.create({ data: { branchId, ...c } })
    })
    customerIds.push(rec.id)
  }
  console.log(`✓ ${customers.length} customers with extended fields`)

  // ─── SUPPLIERS (extended fields) ────────────────────────
  const suppliers = [
    { companyName: 'BINDU', shortForm: 'BINDU', code: '400-B0001', contactName: 'Ravi', phone: '+607-111 0001' },
    { companyName: 'C&S', shortForm: 'C&S', code: '400-C0020', contactName: 'Tan CK', phone: '+607-111 0002' },
    { companyName: 'CASH PURCHASE - FARM', shortForm: 'FARM HARVESTGROW', code: '400-C0015', contactName: 'Own Farm', phone: '+607-511 2696' },
    { companyName: 'CHEONG FATT', shortForm: 'CF', code: '400-C0031', contactName: 'Mr Cheong', phone: '+607-111 0003' },
    { companyName: 'CHUAN WAN', shortForm: 'CW', code: '400-C0013', contactName: 'Ah Wan', phone: '+607-111 0004' },
    { companyName: 'CJ', shortForm: 'CJ', code: '400-C0010', contactName: 'CJ Office', phone: '+607-111 0005' },
    { companyName: 'CK', shortForm: 'CK', code: '400-C0011', contactName: 'Mr CK', phone: '+607-111 0006' },
    { companyName: 'CS AGRICULTURE', shortForm: 'HQ', code: '400-C0012', contactName: 'CS Office', phone: '+607-111 0007' },
    { companyName: 'DD FRESH', shortForm: 'DD', code: '400-D0005', contactName: 'DD Manager', phone: '+607-111 0008' },
    { companyName: 'DOUBLE TREE', shortForm: 'DT', code: '400-D0006', contactName: 'Double Tree', phone: '+607-111 0009' },
    { companyName: 'ENERGY ORGANIC', shortForm: 'EO', code: '400-E0009', contactName: 'Energy Office', phone: '+607-111 0010' },
  ]

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { id: (await prisma.supplier.findFirst({ where: { branchId, companyName: s.companyName } }))?.id || 'x' },
      update: { shortForm: s.shortForm, code: s.code },
      create: { branchId, ...s },
    }).catch(async () => {
      return prisma.supplier.create({ data: { branchId, ...s } })
    })
  }
  console.log(`✓ ${suppliers.length} suppliers with codes`)

  // ─── TRUCKS ─────────────────────────────────────────────
  const trucks = [
    { code: '----', description: 'DEFAULT AGENT' },
    { code: 'JPR', description: 'JPR 2769' },
    { code: 'JQL', description: 'JQL 9069' },
    { code: 'JVU', description: 'JVU 9069' },
    { code: 'JWT', description: 'JWT 9069' },
    { code: 'JYJ', description: 'JYJ 9069' },
  ]

  const truckIds: Record<string, string> = {}
  for (const t of trucks) {
    const rec = await prisma.truck.upsert({
      where: { branchId_code: { branchId, code: t.code } },
      update: { description: t.description },
      create: { branchId, ...t },
    })
    truckIds[t.code] = rec.id
  }
  console.log(`✓ ${trucks.length} trucks`)

  // ─── TRUCK CUSTOMER ASSIGNMENTS ─────────────────────────
  const assignments = [
    { truckCode: 'JPR', customerIdx: 0, level: 1 },
    { truckCode: 'JPR', customerIdx: 1, level: 2 },
    { truckCode: 'JPR', customerIdx: 2, level: 3 },
    { truckCode: 'JQL', customerIdx: 3, level: 1 },
    { truckCode: 'JQL', customerIdx: 4, level: 2 },
    { truckCode: 'JVU', customerIdx: 5, level: 1 },
    { truckCode: 'JVU', customerIdx: 6, level: 2 },
    { truckCode: 'JWT', customerIdx: 7, level: 1 },
    { truckCode: 'JWT', customerIdx: 8, level: 2 },
    { truckCode: 'JYJ', customerIdx: 9, level: 1 },
  ]
  for (const a of assignments) {
    const truckId = truckIds[a.truckCode]
    const customerId = customerIds[a.customerIdx]
    if (!truckId || !customerId) continue
    await prisma.truckCustomerAssignment.upsert({
      where: { truckId_customerId: { truckId, customerId } },
      update: { level: a.level },
      create: { truckId, customerId, level: a.level },
    })
  }
  console.log(`✓ ${assignments.length} truck-customer assignments`)

  // ─── QUOTATION TYPES ────────────────────────────────────
  const quotationTypes = [
    { name: 'PR', templateName: 'Standard Compact (2 Columns)' },
    { name: 'YU XIAO ER', templateName: 'YuXiaoEr Style' },
    { name: 'VG BIG', templateName: 'VG Big Style' },
    { name: 'AEON JUSCO', templateName: 'Normal (Blue Header)' },
    { name: 'HOSPITAL', templateName: 'Normal (Blue Header)' },
    { name: 'MASTER ANP', templateName: 'Normal (Blue Header)' },
    { name: 'TS FOOD', templateName: 'Normal (Blue Header)' },
    { name: 'SG', templateName: 'SG (Standard)' },
    { name: 'SG MINI', templateName: 'SG (Standard)' },
    { name: 'CHARCOAL MASTER', templateName: 'SG (Standard)' },
    { name: 'SUPREMETASTES', templateName: 'SG (Standard)' },
    { name: 'SCHOLAR', templateName: 'Normal (Blue Header)' },
  ]
  for (const qt of quotationTypes) {
    await prisma.quotationType.upsert({
      where: { branchId_name: { branchId, name: qt.name } },
      update: { templateName: qt.templateName },
      create: { branchId, ...qt },
    })
  }
  console.log(`✓ ${quotationTypes.length} quotation types`)

  // ─── PACKING LIST TEMPLATES ─────────────────────────────
  const packingListTemplates = [
    { name: 'VG BIG', templateName: 'Normal' },
    { name: 'JUSCO', templateName: 'TFP' },
    { name: 'HOSPITAL', templateName: 'Normal' },
    { name: 'SG STANDARD', templateName: 'SG Format' },
  ]
  for (const pl of packingListTemplates) {
    await prisma.packingListTemplate.upsert({
      where: { branchId_name: { branchId, name: pl.name } },
      update: { templateName: pl.templateName },
      create: { branchId, ...pl },
    })
  }
  console.log(`✓ ${packingListTemplates.length} packing list templates`)

  // ─── SALES ORDERS ───────────────────────────────────────
  const stockItems = await prisma.stockItem.findMany({ where: { branchId }, select: { id: true, itemCode: true, description: true, uom: true, sellPrice: true } })
  const today = new Date()
  const yy = String(today.getFullYear()).slice(2)
  const mm = String(today.getMonth() + 1).padStart(2, '0')

  const salesOrders = [
    { num: `DO-${yy}${mm}-00002`, status: 'PENDING' as const, customerId: customerIds[0], truck: 'JPR', slot: 'TOMORROW_MORNING', daysAgo: 0, items: [0, 1, 2] },
    { num: `DO-${yy}${mm}-00003`, status: 'PENDING' as const, customerId: customerIds[1], truck: 'JPR', slot: 'TOMORROW_MORNING', daysAgo: 0, items: [3, 4] },
    { num: `DO-${yy}${mm}-00004`, status: 'PENDING' as const, customerId: customerIds[2], truck: 'JQL', slot: 'TOMORROW_MORNING', daysAgo: 0, items: [5, 6, 7] },
    { num: `DO-${yy}${mm}-00005`, status: 'PENDING' as const, customerId: customerIds[3], truck: 'JQL', slot: 'AFTERNOON', daysAgo: 0, items: [0, 2, 4, 6] },
    { num: `DO-${yy}${mm}-00006`, status: 'AWAITING_SHIPMENT' as const, customerId: customerIds[4], truck: 'JVU', slot: 'TOMORROW_MORNING', daysAgo: 1, items: [1, 3, 5] },
    { num: `DO-${yy}${mm}-00007`, status: 'AWAITING_SHIPMENT' as const, customerId: customerIds[5], truck: 'JVU', slot: 'AFTERNOON', daysAgo: 1, items: [0, 7] },
    { num: `DO-${yy}${mm}-00008`, status: 'COMPLETED' as const, customerId: customerIds[6], truck: 'JWT', slot: 'TOMORROW_MORNING', daysAgo: 3, items: [2, 4, 6] },
    { num: `DO-${yy}${mm}-00009`, status: 'COMPLETED' as const, customerId: customerIds[7], truck: 'JWT', slot: 'TOMORROW_MORNING', daysAgo: 4, items: [1, 5, 7] },
    { num: `DO-${yy}${mm}-00010`, status: 'CANCELLED' as const, customerId: customerIds[8], truck: 'JYJ', slot: 'AFTERNOON', daysAgo: 5, items: [0, 3] },
  ]

  for (const so of salesOrders) {
    const exists = await prisma.salesOrder.findFirst({ where: { branchId, salesOrderNumber: so.num } })
    if (exists) continue

    const cust = await prisma.customer.findUnique({ where: { id: so.customerId } })
    const deliveryDate = new Date(today)
    deliveryDate.setDate(deliveryDate.getDate() - so.daysAgo)
    deliveryDate.setUTCHours(0, 0, 0, 0)

    const orderItems = so.items.map((idx, i) => {
      const si = stockItems[idx % stockItems.length]
      const qty = Math.floor(Math.random() * 20) + 5
      const price = Number(si.sellPrice)
      return {
        stockItemId: si.id,
        itemCode: si.itemCode,
        description: si.description,
        quantity: qty,
        unit: si.uom,
        unitPrice: price,
        subtotal: qty * price,
        taxAmount: 0,
        total: qty * price,
        sortOrder: i,
      }
    })

    const subtotal = orderItems.reduce((s, i) => s + i.total, 0)

    await prisma.salesOrder.create({
      data: {
        branchId,
        salesOrderNumber: so.num,
        customerId: so.customerId,
        customerName: cust?.name,
        customerCompanyName: cust?.companyName,
        customerCompanyCode: cust?.companyCode,
        customerBranchLocation: cust?.branchLocation,
        customerBranchCode: cust?.branchCode,
        customerPhone: cust?.phone,
        customerEmail: cust?.email,
        deliveryDate,
        deliverySlot: so.slot,
        deliveryAddress: cust?.address,
        truck: so.truck,
        status: so.status,
        subtotal,
        totalAmount: subtotal,
        createdById: adminId,
        items: { create: orderItems },
      },
    })
  }
  // Update SalesOrderSetting counter
  await prisma.salesOrderSetting.upsert({
    where: { branchId },
    update: { nextNumber: 11 },
    create: { branchId, prefix: 'DO', nextNumber: 11, paddingLength: 5, includeMonth: true },
  })
  console.log(`✓ ${salesOrders.length} sales orders`)

  // ─── PRICING BOARDS ─────────────────────────────────────
  const year = today.getFullYear()
  const boardData = [
    { name: 'First', termDays: 365, validFrom: new Date(year, 0, 1), validTo: new Date(year, 11, 31), status: 'PROCEED' as const, groups: ['MUSTAFA'] },
    { name: '0104 TO 3004', termDays: 30, validFrom: new Date(year, 3, 1), validTo: new Date(year, 3, 30), status: 'PROCEED' as const, groups: ['HOSPITAL', 'SCHOLAR DELIGHTS'] },
    { name: 'Weekly Apr W3', termDays: 7, validFrom: new Date(year, 3, 14), validTo: new Date(year, 3, 20), status: 'PROCEED' as const, groups: ['MASTER ANP', 'TS FOOD', 'CHARCOAL MASTER'] },
    { name: 'SG Weekly', termDays: 3, validFrom: new Date(year, 3, 18), validTo: new Date(year, 3, 20), status: 'DRAFT' as const, groups: ['SG MINI MARKET', 'SUPREMETASTES'] },
  ]

  for (const bd of boardData) {
    const exists = await prisma.pricingBoard.findFirst({ where: { branchId, name: bd.name } })
    if (exists) continue

    const groupIds = bd.groups.map((g) => cgMap[g]).filter(Boolean)
    const boardItems = stockItems.slice(0, 10).map((si) => ({
      stockItemId: si.id,
      price: Number(si.sellPrice) * (0.9 + Math.random() * 0.2),
    }))

    await prisma.pricingBoard.create({
      data: {
        branchId,
        name: bd.name,
        termDays: bd.termDays,
        validFrom: bd.validFrom,
        validTo: bd.validTo,
        status: bd.status,
        createdById: adminId,
        groups: { create: groupIds.map((id) => ({ customerGroupId: id })) },
        items: { create: boardItems.map((i) => ({ stockItemId: i.stockItemId, price: Math.round(i.price * 100) / 100 })) },
      },
    })
  }
  console.log(`✓ ${boardData.length} pricing boards`)

  // ─── PRODUCT CLEARANCE LISTS ────────────────────────────
  const perishableItems = stockItems.filter((_, i) => i < 12)
  for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    date.setUTCHours(0, 0, 0, 0)

    const exists = await prisma.productClearanceList.findFirst({ where: { branchId, date } })
    if (exists) continue

    await prisma.productClearanceList.create({
      data: {
        branchId,
        date,
        status: daysAgo > 3 ? 'CLOSED' : 'OPEN',
        createdById: adminId,
        items: {
          create: perishableItems.map((si) => ({
            stockItemId: si.id,
            quantity: Math.floor(Math.random() * 30) + 5,
            reason: 'Auto-populated perishable item',
            cleared: daysAgo > 3,
          })),
        },
      },
    })
  }
  console.log('✓ 7 product clearance lists')

  // ─── PRICE HISTORY (for Pricing List New page) ──────────
  for (let daysAgo = 0; daysAgo < 14; daysAgo++) {
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(9, 0, 0, 0)

    const existingCount = await prisma.priceHistory.count({
      where: { changedAt: { gte: new Date(date.toISOString().slice(0, 10)), lte: new Date(date.toISOString().slice(0, 10) + 'T23:59:59.999Z') } },
    })
    if (existingCount > 0) continue

    const entries = stockItems.slice(0, 15).map((si) => ({
      stockItemId: si.id,
      oldPrice: Number(si.sellPrice),
      newPrice: Math.round(Number(si.sellPrice) * (0.95 + Math.random() * 0.1) * 100) / 100,
      changedById: adminId,
      changedAt: date,
      note: 'Daily price update',
    }))

    await prisma.priceHistory.createMany({ data: entries })
  }
  console.log('✓ 14 days of price history')

  // ─── STOCK HISTORY (for wastage/return reports) ─────────
  for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)

    const wastageItems = stockItems.slice(0, 3)
    for (const si of wastageItems) {
      const existing = await prisma.stockHistory.findFirst({
        where: { stockItemId: si.id, type: 'OUT', reason: { contains: 'wastage' }, createdAt: { gte: new Date(date.toISOString().slice(0, 10)), lte: new Date(date.toISOString().slice(0, 10) + 'T23:59:59.999Z') } },
      })
      if (existing) continue

      await prisma.stockHistory.create({
        data: {
          branchId,
          stockItemId: si.id,
          type: 'OUT',
          quantity: Math.floor(Math.random() * 5) + 1,
          previousQty: 50,
          newQty: 45,
          reason: 'wastage - expired produce',
          createdById: adminId,
          createdAt: date,
        },
      })
    }

    if (daysAgo % 2 === 0) {
      const returnItem = stockItems[daysAgo % stockItems.length]
      await prisma.stockHistory.create({
        data: {
          branchId,
          stockItemId: returnItem.id,
          type: 'IN',
          quantity: Math.floor(Math.random() * 10) + 2,
          previousQty: 30,
          newQty: 35,
          reason: 'return from customer - quality issue',
          createdById: adminId,
          createdAt: date,
        },
      }).catch(() => {})
    }
  }
  console.log('✓ Stock history (wastage + returns)')

  console.log('\n✅ All seed data populated!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
