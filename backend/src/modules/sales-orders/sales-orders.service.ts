import { PrismaClient } from '@prisma/client'

export async function generateSalesOrderNumber(
  prisma: PrismaClient,
  branchId: string
): Promise<string> {
  const settings = await prisma.salesOrderSetting.findUnique({
    where: { branchId },
  })

  const prefix = settings?.prefix || 'DO'
  const separator = settings?.separator || '-'
  const padding = settings?.paddingLength || 5
  const yearFormat = settings?.yearFormat || 'YY'
  const includeMonth = settings?.includeMonth ?? true

  const now = new Date()
  const year = now.getFullYear()
  const yearStr = yearFormat === 'YY' ? String(year).slice(-2) : String(year)
  const monthStr = String(now.getMonth() + 1).padStart(2, '0')
  const datePart = includeMonth ? `${yearStr}${monthStr}` : yearStr
  const pattern = `${prefix}${separator}${datePart}${separator}`

  const result = await prisma.$queryRaw<{ salesOrderNumber: string }[]>`
    SELECT "salesOrderNumber" FROM sales_orders
    WHERE "branchId" = ${branchId}
    AND "salesOrderNumber" LIKE ${pattern + '%'}
    ORDER BY "createdAt" DESC
    LIMIT 1
    FOR UPDATE
  `

  let nextNum = settings?.nextNumber || 1
  if (result.length > 0) {
    const escapedSep = separator.replace('-', '\\-')
    const match = result[0].salesOrderNumber.match(new RegExp(`${escapedSep}(\\d+)$`))
    if (match) {
      const lastNum = parseInt(match[1])
      nextNum = Math.max(nextNum, lastNum + 1)
    }
  }

  if (settings) {
    await prisma.salesOrderSetting.update({
      where: { id: settings.id },
      data: { nextNumber: nextNum + 1 },
    })
  }

  return `${pattern}${String(nextNum).padStart(padding, '0')}`
}

export function calculateItemTotals(item: {
  quantity: number
  unitPrice: number
  discountPercent?: number
  taxRate?: number
}) {
  const discountPercent = item.discountPercent || 0
  const taxRate = item.taxRate || 0
  const subtotal = Math.round(item.quantity * item.unitPrice * (1 - discountPercent / 100) * 100) / 100
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100
  return { subtotal, taxAmount, total }
}

export function calculateOrderTotals(
  items: { subtotal: number; taxAmount: number; total: number }[],
  discountAmount: number = 0
) {
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100
  const taxAmount = Math.round(items.reduce((sum, i) => sum + i.taxAmount, 0) * 100) / 100
  const totalAmount = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100
  return { subtotal, taxAmount, totalAmount }
}
