import { PrismaClient, DocumentType, DocumentStatus } from '@prisma/client'

// Generate document number with FOR UPDATE lock to prevent race conditions
export async function generateDocumentNumber(
  prisma: PrismaClient,
  branchId: string,
  documentType: DocumentType
): Promise<string> {
  // Get settings for this document type
  const settings = await prisma.documentSetting.findUnique({
    where: { branchId_documentType: { branchId, documentType } },
  })

  const prefix = settings?.prefix || documentType.substring(0, 3)
  const separator = settings?.separator || '-'
  const padding = settings?.paddingLength || 4
  const includeYear = settings?.includeYear ?? true
  const yearFormat = settings?.yearFormat || 'YY'

  const year = new Date().getFullYear()
  const yearStr = yearFormat === 'YY' ? String(year).slice(-2) : String(year)
  const pattern = includeYear ? `${prefix}${yearStr}${separator}` : `${prefix}${separator}`

  // Query last document number with lock
  const result = await prisma.$queryRaw<{ documentNumber: string }[]>`
    SELECT "documentNumber" FROM documents
    WHERE "branchId" = ${branchId}
    AND "documentType" = ${documentType}::"DocumentType"
    AND "documentNumber" LIKE ${pattern + '%'}
    ORDER BY "createdAt" DESC
    LIMIT 1
    FOR UPDATE
  `

  let nextNum = settings?.nextNumber || 1
  if (result.length > 0) {
    const match = result[0].documentNumber.match(new RegExp(`${separator.replace('-', '\\-')}(\\d+)$`))
    if (match) {
      const lastNum = parseInt(match[1])
      nextNum = Math.max(nextNum, lastNum + 1)
    }
  }

  // Update next number in settings
  if (settings) {
    await prisma.documentSetting.update({
      where: { id: settings.id },
      data: { nextNumber: nextNum + 1 },
    })
  }

  return `${pattern}${String(nextNum).padStart(padding, '0')}`
}

// Calculate line item totals
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

// Calculate document totals from items
export function calculateDocumentTotals(
  items: { subtotal: number; taxAmount: number; total: number }[],
  discountAmount: number = 0
) {
  const subtotal = Math.round(items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100
  const taxAmount = Math.round(items.reduce((sum, i) => sum + i.taxAmount, 0) * 100) / 100
  const totalAmount = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100
  return { subtotal, taxAmount, totalAmount }
}

// Get valid statuses for each document type
export function getValidStatuses(type: DocumentType): DocumentStatus[] {
  switch (type) {
    case 'QUOTATION':
      return ['DRAFT', 'PENDING', 'APPROVED', 'SENT', 'COMPLETED', 'CANCELLED']
    case 'INVOICE':
      return ['DRAFT', 'OUTSTANDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID']
    case 'RECEIPT':
      return ['COMPLETED', 'CANCELLED']
    case 'DELIVERY_ORDER':
      return ['DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED']
    default:
      return ['DRAFT']
  }
}

// Get default status for new documents
export function getDefaultStatus(type: DocumentType): DocumentStatus {
  switch (type) {
    case 'RECEIPT':
      return 'COMPLETED'
    default:
      return 'DRAFT'
  }
}

// Get valid conversion targets
export function getConversionTargets(type: DocumentType, status: DocumentStatus): DocumentType[] {
  if (type === 'QUOTATION' && ['APPROVED', 'SENT'].includes(status)) {
    return ['INVOICE']
  }
  if (type === 'INVOICE' && ['PAID', 'PARTIAL'].includes(status)) {
    return ['RECEIPT']
  }
  if (type === 'INVOICE' && !['DRAFT', 'VOID', 'CANCELLED'].includes(status)) {
    return ['DELIVERY_ORDER']
  }
  return []
}
