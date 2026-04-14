import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'
import dotenv from 'dotenv'
import { generateInvoiceFromOrder } from '../src/modules/documents/documents.generator.js'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default branch
  const branch = await prisma.branch.upsert({
    where: { code: 'HG-JB' },
    update: {},
    create: {
      name: 'Harvest Grow Veg Sdn Bhd',
      code: 'HG-JB',
      address: '5 Jalan Kempas Lama, 2/4 Kempas Lama, 81200 Johor Bahru, Johor, Malaysia',
      phone: '+607-511 2696',
      email: 'sales@harvestgrow-veg.com',
      ssmNumber: '201901034939',
      bankName: '',
      bankAccount: '',
    },
  })
  console.log(`Branch created: ${branch.name}`)

  // Create admin user
  const passwordHash = await bcryptjs.hash(process.env.ADMIN_PASSWORD || 'admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@harvestgrow-veg.com' },
    update: {},
    create: {
      branchId: branch.id,
      email: process.env.ADMIN_EMAIL || 'admin@harvestgrow-veg.com',
      passwordHash,
      name: process.env.ADMIN_NAME || 'Admin',
      role: 'ADMIN',
    },
  })
  console.log(`Admin user created: ${admin.email}`)

  // HarvestGrow categories
  const categories = [
    { name: 'Own Plantation', code: 'OWN', sortOrder: 1 },
    { name: 'Packaging', code: 'PKG', sortOrder: 2 },
    { name: 'Process Items', code: 'PRC', sortOrder: 3 },
    { name: 'Vegetables', code: 'VEG', sortOrder: 4 },
    { name: 'Mushroom', code: 'MSH', sortOrder: 5 },
    { name: 'Beancurd', code: 'BCD', sortOrder: 6 },
    { name: 'Noodles', code: 'NDL', sortOrder: 7 },
    { name: 'Others', code: 'OTH', sortOrder: 99 },
  ]

  const catMap: Record<string, string> = {}
  for (const cat of categories) {
    const c = await prisma.stockCategory.upsert({
      where: { branchId_name: { branchId: branch.id, name: cat.name } },
      update: { code: cat.code, sortOrder: cat.sortOrder },
      create: {
        branchId: branch.id,
        name: cat.name,
        code: cat.code,
        sortOrder: cat.sortOrder,
      },
    })
    catMap[cat.name] = c.id
  }
  console.log(`${categories.length} categories created`)

  // Sample stock items
  const stockItems: Array<{ code: string; desc: string; cat: string; uom: string; cost: number; sell: number; qty: number; shelfLifeDays?: number; cutOptions?: string }> = [
    // Own Plantation / Vegetables
    { code: 'VEG-SAWI', desc: 'Sawi (Mustard Greens)', cat: 'Vegetables', uom: 'kg', cost: 3.5, sell: 5.5, qty: 40, shelfLifeDays: 5, cutOptions: JSON.stringify(['whole','cut']) },
    { code: 'VEG-KKG', desc: 'Kangkong (Water Spinach)', cat: 'Vegetables', uom: 'bundle', cost: 1.2, sell: 2.0, qty: 80, shelfLifeDays: 3 },
    { code: 'VEG-PKC', desc: 'Pak Choy', cat: 'Vegetables', uom: 'kg', cost: 3.2, sell: 5.0, qty: 30, shelfLifeDays: 5, cutOptions: JSON.stringify(['whole','cut']) },
    { code: 'VEG-KLN', desc: 'Kailan Cut', cat: 'Vegetables', uom: 'kg', cost: 4.0, sell: 6.5, qty: 25, shelfLifeDays: 4, cutOptions: JSON.stringify(['cut']) },
    { code: 'VEG-CUC', desc: 'Cucumber', cat: 'Vegetables', uom: 'kg', cost: 2.5, sell: 4.0, qty: 50, shelfLifeDays: 7, cutOptions: JSON.stringify(['whole','sliced']) },
    { code: 'VEG-BG',  desc: 'Bitter Gourd', cat: 'Vegetables', uom: 'kg', cost: 4.5, sell: 7.0, qty: 20, shelfLifeDays: 7 },

    // Own Plantation
    { code: 'OWN-HB01', desc: 'Own Plantation Herbs', cat: 'Own Plantation', uom: 'kg', cost: 6.0, sell: 10.0, qty: 10, shelfLifeDays: 5 },

    // Mushroom
    { code: 'MSH-SHI', desc: 'Shiitake Mushroom', cat: 'Mushroom', uom: 'kg', cost: 18.0, sell: 28.0, qty: 10, shelfLifeDays: 7 },
    { code: 'MSH-OYS', desc: 'Oyster Mushroom', cat: 'Mushroom', uom: 'kg', cost: 12.0, sell: 18.0, qty: 15, shelfLifeDays: 5 },
    { code: 'MSH-ENO', desc: 'Enoki Mushroom', cat: 'Mushroom', uom: 'pcs', cost: 2.8, sell: 4.5, qty: 40, shelfLifeDays: 10 },

    // Beancurd
    { code: 'BCD-TG',  desc: 'Tauhu Goreng (Fried Beancurd)', cat: 'Beancurd', uom: 'pcs', cost: 0.8, sell: 1.5, qty: 120, shelfLifeDays: 3 },
    { code: 'BCD-TK',  desc: 'Tau Kwa (Firm Beancurd)', cat: 'Beancurd', uom: 'pcs', cost: 1.2, sell: 2.2, qty: 80, shelfLifeDays: 5 },
    { code: 'BCD-FU',  desc: 'Foo Chuk (Beancurd Skin)', cat: 'Beancurd', uom: 'g', cost: 0.05, sell: 0.08, qty: 500, shelfLifeDays: 30 },

    // Noodles
    { code: 'NDL-MP',  desc: 'Mee Putih (White Noodles)', cat: 'Noodles', uom: 'kg', cost: 3.0, sell: 5.0, qty: 30, shelfLifeDays: 3 },
    { code: 'NDL-KT',  desc: 'Kuey Teow (Flat Rice Noodles)', cat: 'Noodles', uom: 'kg', cost: 3.5, sell: 5.5, qty: 30, shelfLifeDays: 3 },
    { code: 'NDL-MH',  desc: 'Mee Hoon (Rice Vermicelli)', cat: 'Noodles', uom: 'kg', cost: 4.0, sell: 6.0, qty: 20, shelfLifeDays: 60 },

    // Packaging
    { code: 'PKG-BAG1', desc: 'Plastic Bag 1kg', cat: 'Packaging', uom: 'pcs', cost: 0.02, sell: 0.05, qty: 5000 },
    { code: 'PKG-BOX1', desc: 'Carton Box Medium', cat: 'Packaging', uom: 'pcs', cost: 1.5, sell: 2.5, qty: 200 },

    // Process Items
    { code: 'PRC-CUT1', desc: 'Pre-cut Mixed Vegetable Pack 500g', cat: 'Process Items', uom: 'pcs', cost: 5.0, sell: 8.5, qty: 40, shelfLifeDays: 2 },
    { code: 'PRC-STR', desc: 'Stir-fry Vegetable Mix Pack', cat: 'Process Items', uom: 'pcs', cost: 6.0, sell: 10.0, qty: 30, shelfLifeDays: 2 },
  ]

  const LEAFY_CUT = JSON.stringify(['whole', 'sliced', 'diced', 'chopped'])
  const leafyCodes = new Set(['VEG-SAWI', 'VEG-KKG', 'VEG-PKC', 'VEG-KLN'])

  const stockRecords: Record<string, { id: string; sellPrice: number; uom: string; desc: string }> = {}
  for (const item of stockItems) {
    const catId = catMap[item.cat]
    const slug = item.code.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const imageUrl = `/images/products/${slug}.jpg`
    const effCut = leafyCodes.has(item.code) ? LEAFY_CUT : (item.cutOptions ?? null)
    const rec = await prisma.stockItem.upsert({
      where: { branchId_itemCode: { branchId: branch.id, itemCode: item.code } },
      update: { imageUrl, cutOptions: effCut },
      create: {
        branchId: branch.id,
        categoryId: catId,
        itemCode: item.code,
        description: item.desc,
        uom: item.uom,
        costPrice: item.cost,
        sellPrice: item.sell,
        quantity: item.qty,
        minStock: 5,
        imageUrl,
        isPerishable: item.shelfLifeDays !== undefined,
        shelfLifeDays: item.shelfLifeDays ?? null,
        cutOptions: effCut,
      },
    })
    stockRecords[item.code] = { id: rec.id, sellPrice: Number(rec.sellPrice), uom: rec.uom, desc: rec.description }
  }
  console.log(`${stockItems.length} stock items created`)

  // Document settings
  const docTypes = [
    { type: 'QUOTATION' as const, prefix: 'QT', label: 'Quotation' },
    { type: 'INVOICE' as const, prefix: 'INV', label: 'Invoice' },
    { type: 'RECEIPT' as const, prefix: 'RCP', label: 'Receipt' },
    { type: 'DELIVERY_ORDER' as const, prefix: 'DO', label: 'Delivery Order' },
  ]

  for (const doc of docTypes) {
    await prisma.documentSetting.upsert({
      where: { branchId_documentType: { branchId: branch.id, documentType: doc.type } },
      update: {},
      create: {
        branchId: branch.id,
        documentType: doc.type,
        prefix: doc.prefix,
        documentLabel: doc.label,
        templateColor: '#869940',
        defaultNotes: doc.type === 'INVOICE'
          ? 'Payment terms as per agreement. Please make cheques payable to: HARVEST GROW VEG SDN BHD'
          : undefined,
        defaultTerms: doc.type === 'QUOTATION'
          ? 'This quotation is valid for 7 days from the date of issue. Prices subject to daily market changes.'
          : undefined,
      },
    })
  }
  console.log(`${docTypes.length} document settings created`)

  // Payment terms
  const paymentTerms = [
    { name: 'Due on Delivery', days: 0, isDefault: true },
    { name: 'Net 7', days: 7 },
    { name: 'Net 14', days: 14 },
    { name: 'Net 30', days: 30 },
  ]

  for (const term of paymentTerms) {
    const existing = await prisma.paymentTerm.findFirst({
      where: { branchId: branch.id, name: term.name },
    })
    if (!existing) {
      await prisma.paymentTerm.create({
        data: {
          branchId: branch.id,
          name: term.name,
          days: term.days,
          isDefault: term.isDefault || false,
        },
      })
    }
  }
  console.log(`${paymentTerms.length} payment terms created`)

  // Sample customer & supplier
  const customer = await prisma.customer.findFirst({ where: { branchId: branch.id, name: 'Sample Restaurant' } })
  if (!customer) {
    await prisma.customer.create({
      data: {
        branchId: branch.id,
        name: 'Sample Restaurant',
        companyName: 'Sample Restaurant Sdn Bhd',
        phone: '+607-000 0000',
        email: 'orders@sample.com',
      },
    })
  }

  const supplier = await prisma.supplier.findFirst({ where: { branchId: branch.id, companyName: 'Local Farm Supplier' } })
  if (!supplier) {
    await prisma.supplier.create({
      data: {
        branchId: branch.id,
        companyName: 'Local Farm Supplier',
        contactName: 'Ahmad',
        phone: '+607-111 1111',
      },
    })
  }

  // ─── Settings ───────────────────────────────────────────
  const settings = [
    { key: 'shop.delivery.cutoffTime', value: '14:00' },
    { key: 'shop.delivery.fee', value: '0' },
    { key: 'shop.company.address', value: '5 Jalan Kempas Lama, 2/4 Kempas Lama, 81200 Johor Bahru, Johor, Malaysia' },
    { key: 'shop.company.phone', value: '+607-511 2696' },
    { key: 'shop.company.email', value: 'sales@harvestgrow-veg.com' },
    { key: 'delivery.am.endTime', value: '12:00' },
    { key: 'delivery.pm.endTime', value: '18:00' },
    { key: 'invoice.autoGenerateOnDelivered', value: 'true' },
    { key: 'invoice.bankName', value: 'Maybank' },
    { key: 'invoice.bankAccount', value: '5123-4567-8901' },
    { key: 'invoice.bankAccountName', value: 'Harvest Grow Veg Sdn Bhd' },
    { key: 'shop.whatsapp.link', value: 'https://wa.me/60137779069?text=Hi%20HarvestGrow,%20I%20want%20to%20order...' },
  ]
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s })
  }
  console.log(`${settings.length} settings seeded`)

  // ─── Shop customers ─────────────────────────────────────
  const shopPass = await bcryptjs.hash('shop1234', 12)
  const sc1 = await prisma.shopCustomer.upsert({
    where: { phone: '+60123456789' },
    update: {},
    create: {
      name: 'Lim Ah Seng',
      phone: '+60123456789',
      email: 'limseng@example.com',
      address: '12 Jalan Permai, Johor Bahru',
      passwordHash: shopPass,
    },
  })
  const sc2 = await prisma.shopCustomer.upsert({
    where: { phone: '+60198765432' },
    update: {},
    create: {
      name: 'Siti Aminah',
      phone: '+60198765432',
      address: '45 Jalan Melati, Skudai',
    },
  })
  console.log(`Shop customers: ${sc1.name}, ${sc2.name}`)

  // ─── Sample orders ──────────────────────────────────────
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const yy = String(today.getUTCFullYear()).slice(2)
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(today.getUTCDate()).padStart(2, '0')
  const dateKey = `${yy}${mm}${dd}`

  const sampleOrders: Array<{ num: string; status: any; slot: string; customer: any; lines: Array<{ code: string; qty: number; cut?: string }> }> = [
    { num: `HG-${dateKey}-0001`, status: 'PENDING', slot: 'AM', customer: sc1, lines: [ { code: 'VEG-SAWI', qty: 2, cut: 'whole' }, { code: 'VEG-KKG', qty: 3 } ] },
    { num: `HG-${dateKey}-0002`, status: 'PACKING', slot: 'PM', customer: sc2, lines: [ { code: 'MSH-SHI', qty: 1 }, { code: 'BCD-TK', qty: 4 } ] },
    { num: `HG-${dateKey}-0003`, status: 'OUT_FOR_DELIVERY', slot: 'AM', customer: sc1, lines: [ { code: 'VEG-CUC', qty: 1.5 }, { code: 'NDL-MH', qty: 2 } ] },
    { num: `HG-${dateKey}-0004`, status: 'DELIVERED', slot: 'AM', customer: sc2, lines: [ { code: 'VEG-PKC', qty: 2 }, { code: 'MSH-OYS', qty: 1 } ] },
  ]

  const statusLogSeed: Record<string, Array<{ from: any; to: any }>> = {
    [`HG-${dateKey}-0002`]: [
      { from: 'PENDING', to: 'CONFIRMED' },
      { from: 'CONFIRMED', to: 'PICKING' },
      { from: 'PICKING', to: 'PACKING' },
    ],
    [`HG-${dateKey}-0003`]: [
      { from: 'PENDING', to: 'CONFIRMED' },
      { from: 'CONFIRMED', to: 'PICKING' },
      { from: 'PICKING', to: 'PACKING' },
      { from: 'PACKING', to: 'READY' },
      { from: 'READY', to: 'OUT_FOR_DELIVERY' },
    ],
    [`HG-${dateKey}-0004`]: [
      { from: 'PENDING', to: 'CONFIRMED' },
      { from: 'CONFIRMED', to: 'PICKING' },
      { from: 'PICKING', to: 'PACKING' },
      { from: 'PACKING', to: 'READY' },
      { from: 'READY', to: 'OUT_FOR_DELIVERY' },
      { from: 'OUT_FOR_DELIVERY', to: 'DELIVERED' },
    ],
  }

  for (const ord of sampleOrders) {
    const exists = await prisma.order.findUnique({ where: { orderNumber: ord.num } })
    if (exists) continue
    let subtotal = 0
    const lineCreates = ord.lines.map((l) => {
      const sr = stockRecords[l.code]
      const lineTotal = Number((sr.sellPrice * l.qty).toFixed(2))
      subtotal += lineTotal
      return {
        stockItemId: sr.id,
        itemName: sr.desc,
        unit: sr.uom,
        quantity: l.qty,
        unitPrice: sr.sellPrice,
        cutStyle: l.cut || null,
        lineTotal,
      }
    })
    subtotal = Number(subtotal.toFixed(2))
    const created = await prisma.order.create({
      data: {
        orderNumber: ord.num,
        shopCustomerId: ord.customer.id,
        contactName: ord.customer.name,
        contactPhone: ord.customer.phone,
        contactEmail: ord.customer.email,
        deliveryAddress: ord.customer.address || 'n/a',
        deliveryDate: today,
        deliverySlot: ord.slot,
        status: ord.status,
        subtotal,
        deliveryFee: 0,
        total: subtotal,
        lines: { create: lineCreates },
      },
    })
    const logs = statusLogSeed[ord.num]
    if (logs?.length) {
      for (const l of logs) {
        await prisma.orderStatusLog.create({
          data: { orderId: created.id, fromStatus: l.from, toStatus: l.to, note: 'Seeded' },
        })
      }
    }
    // Mark lines picked/packed for advanced orders
    if (ord.status === 'PACKING' || ord.status === 'OUT_FOR_DELIVERY') {
      await prisma.orderLine.updateMany({
        where: { orderId: created.id },
        data: { picked: true, pickedAt: new Date() },
      })
    }
    if (ord.status === 'OUT_FOR_DELIVERY') {
      await prisma.orderLine.updateMany({
        where: { orderId: created.id },
        data: { packed: true, packedAt: new Date() },
      })
    }
  }
  // Counter for today
  await prisma.setting.upsert({
    where: { key: `shop.order.counter.${dateKey}` },
    update: { value: String(sampleOrders.length) },
    create: { key: `shop.order.counter.${dateKey}`, value: String(sampleOrders.length) },
  })
  console.log(`${sampleOrders.length} sample orders seeded`)

  // Generate an invoice for the DELIVERED order
  const deliveredOrder = await prisma.order.findUnique({ where: { orderNumber: `HG-${dateKey}-0004` } })
  if (deliveredOrder && !deliveredOrder.invoiceId) {
    try {
      const res = await prisma.$transaction(async (tx) => {
        return generateInvoiceFromOrder(tx as any, {
          branchId: branch.id,
          orderId: deliveredOrder.id,
          createdById: admin.id,
        })
      })
      console.log(`Sample invoice generated: ${res.documentNumber}`)
    } catch (err: any) {
      console.warn('Sample invoice generation failed:', err.message)
    }
  }

  // Sample purchase invoice from a vegetable supplier
  const veggieSupplier = await prisma.supplier.upsert({
    where: { id: (await prisma.supplier.findFirst({ where: { branchId: branch.id, companyName: 'Cameron Highlands Farms Sdn Bhd' } }))?.id || 'x' },
    update: {},
    create: {
      branchId: branch.id,
      companyName: 'Cameron Highlands Farms Sdn Bhd',
      contactName: 'Encik Tan',
      phone: '+605-491 1234',
      email: 'sales@chfarms.example',
      address: 'Lot 42, Brinchang, Cameron Highlands, Pahang',
    },
  }).catch(async () => {
    return prisma.supplier.findFirstOrThrow({ where: { branchId: branch.id, companyName: 'Cameron Highlands Farms Sdn Bhd' } })
  })

  const existingPi = await prisma.purchaseInvoice.findFirst({
    where: { branchId: branch.id, supplierId: veggieSupplier.id, invoiceNumber: 'CHF-2604-001' },
  })
  if (!existingPi) {
    const sawi = stockRecords['VEG-SAWI']
    const pkc = stockRecords['VEG-PKC']
    const subtotalPi = Number((3.5 * 50 + 3.2 * 30).toFixed(2))
    await prisma.purchaseInvoice.create({
      data: {
        branchId: branch.id,
        supplierId: veggieSupplier.id,
        invoiceNumber: 'CHF-2604-001',
        internalNumber: `PI-${yy}${mm}-0001`,
        status: 'VERIFIED',
        subtotal: subtotalPi,
        taxAmount: 0,
        totalAmount: subtotalPi,
        paidAmount: 0,
        notes: 'Weekly vegetable supply',
        issueDate: today,
        receivedDate: today,
        createdById: admin.id,
        items: {
          create: [
            { stockItemId: sawi?.id, itemCode: 'VEG-SAWI', description: 'Sawi (Mustard Greens) 50kg', quantity: 50, unitPrice: 3.5, total: 175.0, sortOrder: 0 },
            { stockItemId: pkc?.id, itemCode: 'VEG-PKC', description: 'Pak Choy 30kg', quantity: 30, unitPrice: 3.2, total: 96.0, sortOrder: 1 },
          ],
        },
      },
    })
    console.log('Sample purchase invoice seeded: Cameron Highlands Farms')
  }

  // ─── Phase 4: Driver seed ──────────────────────────────
  const driverPass = await bcryptjs.hash('driver123', 12)
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@harvestgrow-veg.com' },
    update: {},
    create: {
      branchId: branch.id,
      email: 'driver@harvestgrow-veg.com',
      passwordHash: driverPass,
      name: 'Ahmad Driver',
      role: 'DRIVER',
      phone: '+60111 222 3333',
      jobTitle: 'Delivery Driver',
    },
  })
  const driverProfile = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: { vehiclePlate: 'JHR 1234', phone: driverUser.phone, active: true },
    create: {
      userId: driverUser.id,
      vehiclePlate: 'JHR 1234',
      phone: driverUser.phone,
      active: true,
    },
  })
  console.log(`Driver seeded: ${driverUser.email}`)

  // Create a DeliveryTrip + DeliveryStop for the OUT_FOR_DELIVERY order
  const ofdOrder = await prisma.order.findUnique({
    where: { orderNumber: `HG-${dateKey}-0003` },
    include: { deliveryStop: true },
  })
  if (ofdOrder && !ofdOrder.deliveryStop) {
    const existingTrip = await prisma.deliveryTrip.findUnique({
      where: { driverId_date_slot: { driverId: driverProfile.id, date: today, slot: 'AM' } },
    })
    const trip = existingTrip ?? await prisma.deliveryTrip.create({
      data: {
        driverId: driverProfile.id,
        date: today,
        slot: 'AM',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    })
    await prisma.deliveryStop.create({
      data: {
        tripId: trip.id,
        orderId: ofdOrder.id,
        sequence: 1,
        status: 'PENDING',
      },
    })
    console.log(`Delivery trip + stop seeded for ${ofdOrder.orderNumber}`)
  }

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
