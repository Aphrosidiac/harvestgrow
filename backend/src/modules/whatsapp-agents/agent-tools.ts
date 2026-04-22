import { PrismaClient } from '@prisma/client'

export interface ToolDef {
  name: string
  description: string
  input_schema: Record<string, any>
}

export const EMPLOYEE_TOOLS: ToolDef[] = [
  {
    name: 'search_products',
    description: 'Search stock items by name or code. Returns items with prices, quantities, and availability.',
    input_schema: { type: 'object', properties: { search: { type: 'string', description: 'Product name or code to search' }, limit: { type: 'integer', description: 'Max results (default 10)' } }, required: ['search'] },
  },
  {
    name: 'check_stock',
    description: 'Check stock quantity and price for a specific item code.',
    input_schema: { type: 'object', properties: { itemCode: { type: 'string', description: 'Exact item code' } }, required: ['itemCode'] },
  },
  {
    name: 'list_customers',
    description: 'Search customers by name, company, or phone.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Search term' } }, required: ['query'] },
  },
  {
    name: 'get_todays_orders',
    description: 'Get today\'s sales order count and status breakdown.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_pending_orders',
    description: 'List orders that are PENDING or AWAITING_SHIPMENT.',
    input_schema: { type: 'object', properties: { limit: { type: 'integer', description: 'Max rows (default 10)' } } },
  },
  {
    name: 'get_low_stock',
    description: 'List items where quantity is at or below minimum stock level.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recent_prices',
    description: 'List the most recent price changes across all products.',
    input_schema: { type: 'object', properties: { limit: { type: 'integer', description: 'Max rows (default 10)' } } },
  },
  {
    name: 'create_quotation_draft',
    description: 'Create a draft sales order with specified items. Returns the order number.',
    input_schema: {
      type: 'object',
      properties: {
        customerName: { type: 'string', description: 'Customer or company name' },
        deliveryDate: { type: 'string', description: 'Delivery date YYYY-MM-DD (default tomorrow)' },
        items: { type: 'array', items: { type: 'object', properties: { product: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' } }, required: ['product', 'quantity'] }, description: 'List of items with product name, quantity, and optional unit' },
      },
      required: ['items'],
    },
  },
  {
    name: 'check_customer_balance',
    description: 'Check a customer\'s outstanding invoice balance and overdue amounts.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Customer name, company name, or phone to search' } }, required: ['query'] },
  },
  {
    name: 'adjust_stock',
    description: 'Record a stock adjustment: wastage, return, or stock-in. Creates a stock history entry and updates quantity.',
    input_schema: {
      type: 'object',
      properties: {
        itemCode: { type: 'string', description: 'Product item code' },
        quantity: { type: 'number', description: 'Quantity to adjust (positive number)' },
        type: { type: 'string', enum: ['IN', 'OUT'], description: 'IN for stock-in/return, OUT for wastage/removal' },
        reason: { type: 'string', description: 'Reason for adjustment (e.g. "wastage - expired", "return from customer")' },
      },
      required: ['itemCode', 'quantity', 'type', 'reason'],
    },
  },
]

export const CLIENT_TOOLS: ToolDef[] = [
  {
    name: 'check_availability',
    description: 'Check if a product is available and its current price.',
    input_schema: { type: 'object', properties: { product: { type: 'string', description: 'Product name to check' } }, required: ['product'] },
  },
  {
    name: 'list_products',
    description: 'List available products, optionally filtered by category.',
    input_schema: { type: 'object', properties: { category: { type: 'string', description: 'Category name (e.g. Vegetables, Mushroom)' }, limit: { type: 'integer', description: 'Max rows (default 20)' } } },
  },
  {
    name: 'get_delivery_info',
    description: 'Get delivery information: available slots, cutoff time, service areas.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'track_order',
    description: 'Find an order by phone number or order number.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Phone number or order number' } }, required: ['query'] },
  },
  {
    name: 'place_order',
    description: 'Place a delivery order for the customer. Requires items with quantities, delivery date and slot. Confirm items with the customer before calling this tool.',
    input_schema: {
      type: 'object',
      properties: {
        contactName: { type: 'string', description: 'Customer name' },
        contactPhone: { type: 'string', description: 'Customer phone number' },
        deliveryDate: { type: 'string', description: 'Delivery date YYYY-MM-DD' },
        deliverySlot: { type: 'string', enum: ['AM', 'PM'], description: 'AM or PM delivery slot' },
        deliveryAddress: { type: 'string', description: 'Delivery address' },
        items: { type: 'array', items: { type: 'object', properties: { product: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' } }, required: ['product', 'quantity'] } },
      },
      required: ['contactName', 'contactPhone', 'deliveryDate', 'deliverySlot', 'items'],
    },
  },
  {
    name: 'repeat_last_order',
    description: 'Find and repeat the customer\'s last order. Looks up by phone number, creates a new order with the same items.',
    input_schema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Customer phone number' },
        deliveryDate: { type: 'string', description: 'New delivery date YYYY-MM-DD (defaults to tomorrow)' },
        deliverySlot: { type: 'string', enum: ['AM', 'PM'], description: 'AM or PM slot (defaults to same as last order)' },
      },
      required: ['phone'],
    },
  },
]

export async function executeTool(prisma: PrismaClient, branchId: string, toolName: string, input: any): Promise<string> {
  try {
    switch (toolName) {
      case 'search_products': {
        const items = await prisma.stockItem.findMany({
          where: { branchId, isActive: true, OR: [{ itemCode: { contains: input.search, mode: 'insensitive' } }, { description: { contains: input.search, mode: 'insensitive' } }] },
          select: { itemCode: true, description: true, uom: true, sellPrice: true, quantity: true },
          take: input.limit || 10,
          orderBy: { description: 'asc' },
        })
        if (!items.length) return 'No products found matching "' + input.search + '".'
        return items.map((i) => `${i.itemCode} — ${i.description} | ${i.uom} | RM ${Number(i.sellPrice).toFixed(2)} | Stock: ${i.quantity}`).join('\n')
      }

      case 'check_stock': {
        const item = await prisma.stockItem.findFirst({
          where: { branchId, itemCode: { equals: input.itemCode, mode: 'insensitive' } },
          select: { itemCode: true, description: true, uom: true, sellPrice: true, costPrice: true, quantity: true, minStock: true },
        })
        if (!item) return 'Item code "' + input.itemCode + '" not found.'
        return `${item.description} (${item.itemCode})\nPrice: RM ${Number(item.sellPrice).toFixed(2)}/${item.uom}\nCost: RM ${Number(item.costPrice).toFixed(2)}\nStock: ${item.quantity} ${item.uom} (min: ${item.minStock})`
      }

      case 'check_availability': {
        const items = await prisma.stockItem.findMany({
          where: { branchId, isActive: true, OR: [{ description: { contains: input.product, mode: 'insensitive' } }, { itemCode: { contains: input.product, mode: 'insensitive' } }] },
          select: { itemCode: true, description: true, uom: true, sellPrice: true, quantity: true },
          take: 5,
        })
        if (!items.length) return 'Sorry, no products found matching "' + input.product + '".'
        return items.map((i) => `${i.description}: ${i.quantity > 0 ? '✅ Available' : '❌ Out of stock'} — RM ${Number(i.sellPrice).toFixed(2)}/${i.uom} (${i.quantity} in stock)`).join('\n')
      }

      case 'list_products': {
        const where: any = { branchId, isActive: true, quantity: { gt: 0 } }
        if (input.category) where.category = { name: { contains: input.category, mode: 'insensitive' } }
        const items = await prisma.stockItem.findMany({
          where,
          select: { description: true, uom: true, sellPrice: true, quantity: true, category: { select: { name: true } } },
          take: input.limit || 20,
          orderBy: { description: 'asc' },
        })
        if (!items.length) return 'No products available' + (input.category ? ' in category "' + input.category + '"' : '') + '.'
        return items.map((i) => `• ${i.description} — RM ${Number(i.sellPrice).toFixed(2)}/${i.uom} [${i.category?.name || 'Other'}]`).join('\n')
      }

      case 'list_customers': {
        const customers = await prisma.customer.findMany({
          where: { branchId, OR: [{ name: { contains: input.query, mode: 'insensitive' } }, { companyName: { contains: input.query, mode: 'insensitive' } }, { phone: { contains: input.query } }] },
          select: { name: true, companyName: true, companyCode: true, phone: true, branchLocation: true },
          take: 10,
        })
        if (!customers.length) return 'No customers found for "' + input.query + '".'
        return customers.map((c) => `${c.companyName || c.name}${c.companyCode ? ' (' + c.companyCode + ')' : ''} — ${c.phone || 'no phone'}${c.branchLocation ? ' [' + c.branchLocation + ']' : ''}`).join('\n')
      }

      case 'get_todays_orders': {
        const today = new Date(); today.setUTCHours(0, 0, 0, 0)
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
        const orders = await prisma.salesOrder.findMany({
          where: { branchId, createdAt: { gte: today, lt: tomorrow } },
          select: { status: true, totalAmount: true },
        })
        const total = orders.reduce((s, o) => s + Number(o.totalAmount), 0)
        const byStatus: Record<string, number> = {}
        orders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1 })
        return `Today: ${orders.length} orders, total RM ${total.toFixed(2)}\n${Object.entries(byStatus).map(([s, c]) => `${s}: ${c}`).join(', ')}`
      }

      case 'list_pending_orders': {
        const orders = await prisma.salesOrder.findMany({
          where: { branchId, status: { in: ['PENDING', 'AWAITING_SHIPMENT'] } },
          select: { salesOrderNumber: true, customerCompanyName: true, customerName: true, status: true, totalAmount: true, deliveryDate: true },
          take: input.limit || 10,
          orderBy: { createdAt: 'desc' },
        })
        if (!orders.length) return 'No pending orders.'
        return orders.map((o) => `${o.salesOrderNumber} — ${o.customerCompanyName || o.customerName || 'N/A'} | ${o.status} | RM ${Number(o.totalAmount).toFixed(2)}`).join('\n')
      }

      case 'get_low_stock': {
        const items = await prisma.$queryRaw<any[]>`SELECT "itemCode", description, uom, quantity, "minStock" FROM stock_items WHERE "branchId" = ${branchId} AND "isActive" = true AND quantity <= "minStock" ORDER BY quantity ASC LIMIT 15`
        if (!items.length) return 'No low stock alerts.'
        return items.map((i: any) => `⚠️ ${i.description} (${i.itemCode}): ${i.quantity}/${i.minStock} ${i.uom}`).join('\n')
      }

      case 'get_recent_prices': {
        const prices = await prisma.priceHistory.findMany({
          include: { stockItem: { select: { itemCode: true, description: true } } },
          orderBy: { changedAt: 'desc' },
          take: input.limit || 10,
        })
        if (!prices.length) return 'No recent price changes.'
        return prices.map((p) => `${p.stockItem.description}: RM ${Number(p.oldPrice).toFixed(2)} → RM ${Number(p.newPrice).toFixed(2)}`).join('\n')
      }

      case 'get_delivery_info': {
        const settings = await prisma.setting.findMany({
          where: { key: { in: ['shop.delivery.cutoffTime', 'delivery.am.endTime', 'delivery.pm.endTime', 'shop.company.phone', 'shop.serviceable.postcodes'] } },
        })
        const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
        return `Delivery Info:\n• Cutoff: ${map['shop.delivery.cutoffTime'] || 'N/A'}\n• AM slot: until ${map['delivery.am.endTime'] || '12:00'}\n• PM slot: until ${map['delivery.pm.endTime'] || '18:00'}\n• Service areas: ${map['shop.serviceable.postcodes'] || 'Contact us'}\n• Contact: ${map['shop.company.phone'] || '+607-511 2696'}`
      }

      case 'track_order': {
        const order = await prisma.salesOrder.findFirst({
          where: { branchId, OR: [{ salesOrderNumber: { contains: input.query, mode: 'insensitive' } }, { customerPhone: { contains: input.query } }] },
          select: { salesOrderNumber: true, status: true, customerName: true, deliveryDate: true, totalAmount: true, deliverySlot: true },
          orderBy: { createdAt: 'desc' },
        })
        if (!order) {
          const shopOrder = await prisma.order.findFirst({
            where: { OR: [{ orderNumber: { contains: input.query, mode: 'insensitive' } }, { contactPhone: { contains: input.query } }] },
            select: { orderNumber: true, status: true, contactName: true, deliveryDate: true, total: true, deliverySlot: true },
            orderBy: { createdAt: 'desc' },
          })
          if (!shopOrder) return 'No order found for "' + input.query + '".'
          return `Order ${shopOrder.orderNumber}\nStatus: ${shopOrder.status}\nCustomer: ${shopOrder.contactName}\nDelivery: ${new Date(shopOrder.deliveryDate).toLocaleDateString('en-MY')} (${shopOrder.deliverySlot})\nTotal: RM ${Number(shopOrder.total).toFixed(2)}`
        }
        return `Order ${order.salesOrderNumber}\nStatus: ${order.status}\nCustomer: ${order.customerName || 'N/A'}\nDelivery: ${new Date(order.deliveryDate).toLocaleDateString('en-MY')} (${order.deliverySlot})\nTotal: RM ${Number(order.totalAmount).toFixed(2)}`
      }

      case 'create_quotation_draft': {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setUTCHours(0, 0, 0, 0)
        const deliveryDate = input.deliveryDate ? new Date(input.deliveryDate) : tomorrow

        const itemCreates = []
        for (const reqItem of input.items) {
          const found = await prisma.stockItem.findFirst({
            where: { branchId, isActive: true, OR: [{ description: { contains: reqItem.product, mode: 'insensitive' } }, { itemCode: { contains: reqItem.product, mode: 'insensitive' } }] },
            select: { id: true, itemCode: true, description: true, uom: true, sellPrice: true },
          })
          const price = found ? Number(found.sellPrice) : 0
          const qty = Number(reqItem.quantity) || 1
          itemCreates.push({
            stockItemId: found?.id || null,
            itemCode: found?.itemCode || null,
            description: found?.description || reqItem.product,
            quantity: qty,
            unit: reqItem.unit || found?.uom || 'kg',
            unitPrice: price,
            subtotal: qty * price,
            taxAmount: 0,
            total: qty * price,
            sortOrder: itemCreates.length,
          })
        }

        const subtotal = itemCreates.reduce((s, i) => s + i.total, 0)
        const admin = await prisma.user.findFirst({ where: { branchId, role: 'ADMIN' } })

        const setting = await prisma.salesOrderSetting.findUnique({ where: { branchId } })
        const yy = String(new Date().getFullYear()).slice(2)
        const mm = String(new Date().getMonth() + 1).padStart(2, '0')
        const nextNum = setting?.nextNumber || 1
        const orderNum = `DO-${yy}${mm}-${String(nextNum).padStart(5, '0')}`

        const order = await prisma.salesOrder.create({
          data: {
            branchId, salesOrderNumber: orderNum, customerName: input.customerName || null,
            deliveryDate, deliverySlot: 'TOMORROW_MORNING', status: 'PENDING',
            subtotal, totalAmount: subtotal, createdById: admin?.id || '',
            items: { create: itemCreates },
          },
        })

        if (setting) await prisma.salesOrderSetting.update({ where: { branchId }, data: { nextNumber: nextNum + 1 } })

        const summary = itemCreates.map((i) => `• ${i.description} — ${i.quantity} ${i.unit} @ RM ${i.unitPrice.toFixed(2)}`).join('\n')
        return `✅ Quotation created: ${order.salesOrderNumber}\n${input.customerName ? 'Customer: ' + input.customerName + '\n' : ''}Delivery: ${deliveryDate.toLocaleDateString('en-MY')}\n\n${summary}\n\nTotal: RM ${subtotal.toFixed(2)}`
      }

      case 'check_customer_balance': {
        // Find customer by name/company/phone
        const customer = await prisma.customer.findFirst({
          where: { branchId, OR: [
            { name: { contains: input.query, mode: 'insensitive' } },
            { companyName: { contains: input.query, mode: 'insensitive' } },
            { phone: { contains: input.query } },
          ]},
          select: { id: true, name: true, companyName: true, phone: true },
        })
        if (!customer) return 'No customer found for "' + input.query + '".'

        // Get outstanding invoices
        const invoices = await prisma.document.findMany({
          where: { branchId, customerId: customer.id, documentType: 'INVOICE', status: { in: ['OUTSTANDING', 'PARTIAL'] } },
          select: { documentNumber: true, totalAmount: true, paidAmount: true, dueDate: true, status: true },
          orderBy: { dueDate: 'asc' },
        })

        if (!invoices.length) return `${customer.companyName || customer.name} has no outstanding invoices. ✅`

        const today = new Date()
        let totalOwed = 0
        let totalOverdue = 0
        const lines: string[] = []
        for (const inv of invoices) {
          const owed = Number(inv.totalAmount) - Number(inv.paidAmount)
          totalOwed += owed
          const isOverdue = inv.dueDate && new Date(inv.dueDate) < today
          if (isOverdue) totalOverdue += owed
          lines.push(`${inv.documentNumber}: RM ${owed.toFixed(2)}${isOverdue ? ' ⚠️ OVERDUE' : ''}`)
        }

        return `${customer.companyName || customer.name}\nTotal outstanding: RM ${totalOwed.toFixed(2)}${totalOverdue > 0 ? `\nOverdue: RM ${totalOverdue.toFixed(2)}` : ''}\n\n${lines.join('\n')}`
      }

      case 'adjust_stock': {
        const item = await prisma.stockItem.findFirst({
          where: { branchId, itemCode: { equals: input.itemCode, mode: 'insensitive' }, isActive: true },
          select: { id: true, itemCode: true, description: true, quantity: true, uom: true },
        })
        if (!item) return 'Item code "' + input.itemCode + '" not found.'

        const qty = Math.abs(Number(input.quantity))
        if (qty <= 0) return 'Quantity must be positive.'

        const newQty = input.type === 'IN' ? item.quantity + qty : item.quantity - qty
        if (newQty < 0) return `Cannot remove ${qty} ${item.uom} — only ${item.quantity} in stock.`

        await prisma.stockItem.update({ where: { id: item.id }, data: { quantity: newQty } })

        // Find admin user for createdBy
        const adjustAdmin = await prisma.user.findFirst({ where: { branchId, role: 'ADMIN' } })
        await prisma.stockHistory.create({
          data: {
            branchId, stockItemId: item.id, type: input.type,
            quantity: qty, previousQty: item.quantity, newQty,
            reason: input.reason, createdById: adjustAdmin?.id || '',
          },
        })

        return `✅ Stock adjusted: ${item.description} (${item.itemCode})\n${input.type === 'IN' ? '+' : '-'}${qty} ${item.uom} — ${input.reason}\nNew stock: ${newQty} ${item.uom}`
      }

      case 'place_order': {
        if (!input.items?.length) return 'No items specified.'

        const orderLines = []
        for (const reqItem of input.items) {
          const found = await prisma.stockItem.findFirst({
            where: { branchId, isActive: true, OR: [
              { description: { contains: reqItem.product, mode: 'insensitive' } },
              { itemCode: { contains: reqItem.product, mode: 'insensitive' } },
            ]},
            select: { id: true, itemCode: true, description: true, uom: true, sellPrice: true, quantity: true },
          })
          if (!found) return `Product "${reqItem.product}" not found. Please check the product name.`
          if (found.quantity < reqItem.quantity) return `Not enough stock for ${found.description}: only ${found.quantity} ${found.uom} available.`

          const qty = Number(reqItem.quantity)
          const price = Number(found.sellPrice)
          orderLines.push({
            stockItem: { connect: { id: found.id } },
            itemName: found.description,
            unit: reqItem.unit || found.uom,
            quantity: qty,
            unitPrice: price,
            lineTotal: qty * price,
          })
        }

        const subtotal = orderLines.reduce((s, l) => s + Number(l.lineTotal), 0)

        // Generate order number
        const orderToday = new Date()
        const dateStr = orderToday.toISOString().slice(2, 10).replace(/-/g, '')
        const count = await prisma.order.count({ where: { createdAt: { gte: new Date(orderToday.getFullYear(), orderToday.getMonth(), orderToday.getDate()) } } })
        const orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(3, '0')}`

        const order = await prisma.order.create({
          data: {
            orderNumber,
            contactName: input.contactName,
            contactPhone: input.contactPhone,
            deliveryAddress: input.deliveryAddress || '',
            deliveryDate: new Date(input.deliveryDate),
            deliverySlot: input.deliverySlot,
            status: 'PENDING',
            subtotal, deliveryFee: 0, total: subtotal,
            lines: { create: orderLines },
          },
        })

        const orderSummary = orderLines.map(l => `• ${l.itemName} — ${l.quantity} ${l.unit} @ RM ${Number(l.unitPrice).toFixed(2)}`).join('\n')
        return `✅ Order placed! ${order.orderNumber}\nDelivery: ${new Date(input.deliveryDate).toLocaleDateString('en-MY')} (${input.deliverySlot})\n\n${orderSummary}\n\nTotal: RM ${subtotal.toFixed(2)}\n\nWe'll confirm your order shortly.`
      }

      case 'repeat_last_order': {
        const cleanPhone = input.phone.replace(/[^0-9]/g, '')

        // Try SalesOrder first, then Order
        const lastSO = await prisma.salesOrder.findFirst({
          where: { branchId, customerPhone: { contains: cleanPhone } },
          include: { items: { select: { description: true, quantity: true, unit: true, unitPrice: true, stockItemId: true } } },
          orderBy: { createdAt: 'desc' },
        })

        let lastOrder: any = lastSO
        if (!lastOrder) {
          lastOrder = await prisma.order.findFirst({
            where: { contactPhone: { contains: cleanPhone } },
            include: { lines: { select: { itemName: true, quantity: true, unit: true, unitPrice: true, stockItemId: true } } },
            orderBy: { createdAt: 'desc' },
          })
        }

        if (!lastOrder) return 'No previous orders found for this phone number.'

        const repeatItems = lastOrder.items || lastOrder.lines || []
        if (!repeatItems.length) return 'Last order had no items.'

        const repeatTomorrow = new Date(); repeatTomorrow.setDate(repeatTomorrow.getDate() + 1); repeatTomorrow.setUTCHours(0, 0, 0, 0)
        const deliveryDate = input.deliveryDate ? new Date(input.deliveryDate) : repeatTomorrow
        const slot = input.deliverySlot || lastOrder.deliverySlot || 'AM'

        // Show what would be re-ordered and ask for confirmation
        const repeatSummary = repeatItems.map((i: any) => {
          const name = i.description || i.itemName
          const itemQty = Number(i.quantity)
          const unit = i.unit
          const price = Number(i.unitPrice)
          return `• ${name} — ${itemQty} ${unit} @ RM ${price.toFixed(2)}`
        }).join('\n')

        const repeatTotal = repeatItems.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unitPrice), 0)

        return `Last order found (${lastOrder.salesOrderNumber || lastOrder.orderNumber}):\n\n${repeatSummary}\n\nTotal: RM ${repeatTotal.toFixed(2)}\nDelivery: ${deliveryDate.toLocaleDateString('en-MY')} (${slot})\n\nWould you like me to place this order?`
      }

      default:
        return 'Unknown tool: ' + toolName
    }
  } catch (err: any) {
    return 'Error: ' + (err.message || 'Tool execution failed')
  }
}
