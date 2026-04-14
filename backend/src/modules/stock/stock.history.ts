import { PrismaClient, StockMovementType } from '@prisma/client'

interface RecordHistoryParams {
  prisma: PrismaClient | any
  branchId: string
  stockItemId: string
  type: StockMovementType
  quantity: number
  previousQty: number
  newQty: number
  reason: string
  documentId?: string
  createdById: string
}

export async function recordStockHistory(params: RecordHistoryParams) {
  return params.prisma.stockHistory.create({
    data: {
      branchId: params.branchId,
      stockItemId: params.stockItemId,
      type: params.type,
      quantity: params.quantity,
      previousQty: params.previousQty,
      newQty: params.newQty,
      reason: params.reason,
      documentId: params.documentId,
      createdById: params.createdById,
    },
  })
}
