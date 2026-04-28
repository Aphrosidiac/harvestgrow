export type UserGroup = 'SUPER_ADMIN' | 'BOSS' | 'ADMIN' | 'INVENTORY_MANAGER'

export interface User {
  id: string
  username?: string
  email: string
  name: string
  phone?: string
  jobTitle?: string
  role: 'ADMIN' | 'MANAGER' | 'PRODUCTION' | 'PACKER' | 'DRIVER'
  userGroup?: UserGroup | null
  branchId: string
  isActive?: boolean
  _count?: { foremanDocuments: number }
  createdAt?: string
}

export interface Branch {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
}

export interface StockCategory {
  id: string
  name: string
  code?: string
  sortOrder: number
  branchId: string
  _count?: { items: number }
}

export interface StockItem {
  id: string
  itemCode: string
  description: string
  uom: string
  costPrice: number
  sellPrice: number
  quantity: number
  holdQuantity: number
  minStock: number
  categoryId?: string
  category?: StockCategory
  imageUrl?: string
  previousPrice?: number
  priceUpdatedAt?: string
  isPerishable?: boolean
  shelfLifeDays?: number
  cutOptions?: string
  branchId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─── DOCUMENTS ─────────────────────────────────────────────
export type DocumentType = 'QUOTATION' | 'INVOICE' | 'RECEIPT' | 'DELIVERY_ORDER'

export type DocumentStatus =
  | 'DRAFT' | 'PENDING' | 'APPROVED' | 'SENT'
  | 'OUTSTANDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  | 'COMPLETED' | 'CANCELLED' | 'VOID'

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD' | 'EWALLET' | 'TNG' | 'BOOST'

export interface DocumentItem {
  id: string
  documentId: string
  stockItemId?: string
  itemCode?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxRate: number
  subtotal: number
  taxAmount: number
  total: number
  sortOrder: number
  serviceDate?: string
  serviceReminderSent?: boolean
}

export interface Payment {
  id: string
  documentId: string
  amount: number
  paymentMethod: PaymentMethod
  referenceNumber?: string
  notes?: string
  bankName?: string
  createdBy?: { name: string }
  createdAt: string
}

export interface Document {
  id: string
  branchId: string
  documentType: DocumentType
  documentNumber: string
  customerName?: string
  customerCompanyName?: string
  customerPhone?: string
  customerEmail?: string
  vehiclePlate?: string
  vehicleModel?: string
  vehicleMileage?: string
  vehicleColor?: string
  vehicleEngineNo?: string
  issueDate: string
  dueDate?: string
  status: DocumentStatus
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  notes?: string
  terms?: string
  footerNote?: string
  createdBy?: User
  foremanId?: string
  foreman?: { id: string; name: string; jobTitle?: string; phone?: string }
  items?: DocumentItem[]
  payments?: Payment[]
  convertedFromId?: string
  convertedFromType?: DocumentType
  conversionTargets?: DocumentType[]
  _count?: { items: number; payments: number }
  createdAt: string
  updatedAt: string
}

export interface DocumentSetting {
  id: string
  branchId: string
  documentType: DocumentType
  prefix: string
  nextNumber: number
  paddingLength: number
  includeYear: boolean
  yearFormat: string
  separator: string
  template: string
  templateColor: string
  documentLabel?: string
  footerNotes?: string
  documentSize: string
  logoScale: number
  defaultNotes?: string
  defaultTerms?: string
  defaultPaymentTermDays: number
}

export interface PaymentTerm {
  id: string
  branchId: string
  name: string
  days: number
  description?: string
  isDefault: boolean
  isActive: boolean
}

// ─── CUSTOMER & VEHICLE ────────────────────────────────────
export interface Vehicle {
  id: string
  customerId: string
  plate: string
  make?: string
  model?: string
  color?: string
  engineNo?: string
  mileage?: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  branchId: string
  name: string
  companyName?: string
  phone?: string
  email?: string
  vehicles?: Vehicle[]
  _count?: { documents: number }
  createdAt: string
  updatedAt: string
}

// ─── STOCK HISTORY ─────────────────────────────────────────
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'HOLD' | 'RELEASE'

export interface StockHistory {
  id: string
  branchId: string
  stockItemId: string
  type: StockMovementType
  quantity: number
  previousQty: number
  newQty: number
  reason: string
  documentId?: string
  document?: { documentNumber: string }
  stockItem?: { itemCode: string; description: string }
  createdBy?: { name: string }
  createdAt: string
}

export interface PriceHistoryEntry {
  id: string
  stockItemId: string
  oldPrice: number
  newPrice: number
  changedAt: string
  changedBy?: { id: string; name: string }
  note?: string
}

export interface DocumentFormData {
  documentType: DocumentType
  customerId?: string
  vehicleId?: string
  customerName?: string
  customerCompanyName?: string
  customerPhone?: string
  customerEmail?: string
  vehiclePlate?: string
  vehicleModel?: string
  vehicleMileage?: string
  vehicleColor?: string
  vehicleEngineNo?: string
  foremanId?: string
  issueDate?: string
  dueDate?: string
  notes?: string
  terms?: string
  footerNote?: string
  discountAmount?: number
  items: {
    stockItemId?: string
    itemCode?: string
    description: string
    quantity: number
    unit?: string
    unitPrice: number
    discountPercent?: number
    taxRate?: number
    sortOrder?: number
    serviceDate?: string
  }[]
}

// ─── DASHBOARD ─────────────────────────────────────────────
export interface DashboardStats {
  totalItems: number
  totalStockQty: number
  invoicesToday: number
  invoicesThisMonth: number
  quotationsThisMonth: number
  revenueToday: number
  revenueThisMonth: number
}

// ─── GENERIC ───────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// ─── SHOP (public storefront) ──────────────────────────────
export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PICKING' | 'CUTTING' | 'PACKING'
  | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

export interface ShopCategory {
  id: string
  name: string
  code?: string
  productCount: number
}

export interface ShopProduct {
  id: string
  name: string
  description: string
  imageUrl?: string | null
  sellPrice: number
  previousPrice?: number | null
  unit: string
  cutOptions: string[]
  isPerishable?: boolean
  shelfLifeDays?: number | null
  category?: { id: string; name: string }
  inStock?: boolean
}

export interface ShopOrderLine {
  id: string
  stockItemId: string
  itemName: string
  unit: string
  quantity: number
  unitPrice: number
  cutStyle?: string | null
  notes?: string | null
  lineTotal: number
  picked?: boolean
  pickedAt?: string | null
  packed?: boolean
  packedAt?: string | null
  stockItem?: { id: string; itemCode?: string; imageUrl?: string | null; quantity?: number; isPerishable?: boolean }
}

export interface OrderStatusLogEntry {
  id: string
  orderId: string
  fromStatus?: OrderStatus | null
  toStatus: OrderStatus
  note?: string | null
  createdAt: string
  changedBy?: { id: string; name: string; role: string } | null
}

export interface BoardCard {
  id: string
  orderNumber: string
  contactName: string
  deliverySlot: string
  deliveryDate: string
  lineCount: number
  total: number
  perishableCount: number
  oldestPendingMinutes: number
  status: OrderStatus
  createdAt: string
}

export interface ProductionAlert {
  orderId: string
  orderNumber: string
  slot: string
  status: string
  minutesOverdue: number
}

export interface ShopOrder {
  id: string
  orderNumber: string
  contactName: string
  contactPhone: string
  contactEmail?: string | null
  deliveryAddress: string
  deliveryDate: string
  deliverySlot: string
  notes?: string | null
  status: OrderStatus
  paymentStatus: string
  subtotal: number
  deliveryFee: number
  total: number
  invoiceId?: string | null
  deliveryOrderId?: string | null
  invoice?: { id: string; documentNumber: string; status: string; totalAmount: number | string } | null
  deliveryOrder?: { id: string; documentNumber: string; status: string } | null
  shopCustomerId?: string | null
  shopCustomer?: { id: string; name: string; phone: string } | null
  lines?: ShopOrderLine[]
  statusLogs?: OrderStatusLogEntry[]
  createdAt: string
  updatedAt: string
}

// ─── DELIVERY (Phase 4) ────────────────────────────────────
export type TripStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type StopStatus = 'PENDING' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'SKIPPED'

export interface Driver {
  id: string
  userId: string
  vehiclePlate?: string | null
  phone?: string | null
  active: boolean
  createdAt: string
  user?: { id: string; name: string; email: string; phone?: string | null; role: string; isActive?: boolean }
}

export interface DeliveryStop {
  id: string
  tripId: string
  orderId: string
  sequence: number
  status: StopStatus
  arrivedAt?: string | null
  deliveredAt?: string | null
  failureReason?: string | null
  proofPhotoUrl?: string | null
  signatureDataUrl?: string | null
  receivedByName?: string | null
  notes?: string | null
  order?: Partial<ShopOrder> & {
    id: string
    orderNumber: string
    contactName: string
    contactPhone: string
    deliveryAddress: string
    total: number
    lines?: ShopOrderLine[]
  }
}

export interface DeliveryTrip {
  id: string
  driverId: string
  date: string
  slot: string
  status: TripStatus
  startedAt?: string | null
  completedAt?: string | null
  notes?: string | null
  createdAt: string
  driver?: Driver
  stops?: DeliveryStop[]
  totalStops?: number
  completedStops?: number
  statusCounts?: Record<string, number>
}

export interface ReadyOrderForDispatch {
  id: string
  orderNumber: string
  contactName: string
  contactPhone: string
  deliveryAddress: string
  deliverySlot: string
  total: number
  lineCount: number
  perishableCount: number
  status: OrderStatus
}

export interface DeliveryAlerts {
  unassigned: Array<{ orderId: string; orderNumber: string; contactName: string; slot: string; minutesSinceReady: number }>
  overdue: Array<{ stopId: string; orderNumber: string; contactName: string; slot: string; status: string; minutesOverdue: number }>
  failed: Array<{ stopId: string; orderNumber: string; contactName: string; slot: string; failureReason?: string | null }>
}

export interface CutoffInfo {
  cutoffTime: string
  todayCutoff: string
  isPastCutoff: boolean
  nextDeliveryDate: string
}

// ─── SALES ORDER ──────────────────────────────────────────
export type SalesOrderStatus =
  | 'PENDING' | 'AWAITING_SHIPMENT' | 'COMPLETED'
  | 'RETURN_ORDER' | 'COMBINED' | 'CANCELLED'

export interface SalesOrderItem {
  id: string
  salesOrderId: string
  stockItemId?: string
  itemCode?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxRate: number
  subtotal: number
  taxAmount: number
  total: number
  sortOrder: number
  notes?: string
  secondDescription?: string
  remark?: string
  imageUrl?: string
  foc?: boolean
  processing?: string
  stockItem?: { id: string; imageUrl?: string; cutOptions?: string; quantity?: number }
}

export interface SalesOrder {
  id: string
  branchId: string
  salesOrderNumber: string
  customerId?: string
  customerName?: string
  customerCompanyName?: string
  customerCompanyCode?: string
  customerBranchLocation?: string
  customerBranchCode?: string
  customerPhone?: string
  customerEmail?: string
  poNumber?: string
  invoiceNumber?: string
  deliveryDate: string
  deliverySlot: string
  deliveryAddress?: string
  truck?: string
  status: SalesOrderStatus
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  notes?: string
  creditTerm?: string
  creditLimit?: number
  country?: string
  basket?: number
  box?: number
  deliverRemark?: string
  createdBy?: { id: string; name: string }
  customer?: Customer
  items?: SalesOrderItem[]
  _count?: { items: number }
  createdAt: string
  updatedAt: string
}

export interface StockItemUom {
  id: string
  stockItemId: string
  uomCode: string
  price: number
  isBase: boolean
  weightKg?: number
  isActive: boolean
}

// ─── PRODUCT CLEARANCE ───────────────────────────────────
export interface ClearanceList {
  id: string
  branchId: string
  date: string
  status: 'OPEN' | 'CLOSED'
  createdBy?: { id: string; name: string }
  items?: ClearanceItem[]
  _count?: { items: number }
  createdAt: string
  updatedAt: string
}

export interface ClearanceItem {
  id?: string
  clearanceListId?: string
  stockItemId: string
  sortOrder: number
  inSupplierId: string | null
  inQty: number
  cost: number
  yesterdayBalance: number
  outPacking: number
  outLoose: number
  returnIn: number
  estimatedBalance: number
  actualBalance: number
  lost: number
  wastage: number
  supplyReturnSupplierId: string | null
  supplyReturnQty: number
  stockItem?: { id: string; itemCode: string; description: string; imageUrl?: string; uom: string; sellPrice: number; costPrice: number; quantity: number }
  inSupplier?: { id: string; companyName: string; shortForm?: string }
  supplyReturnSupplier?: { id: string; companyName: string; shortForm?: string }
}

export interface ClearanceSettingItem {
  id: string
  itemCode: string
  description: string
  imageUrl: string | null
  showInClearance: boolean
}

