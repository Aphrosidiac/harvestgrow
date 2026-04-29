<template>
  <div>
    <button @click="$router.push('/app/sales-order')" class="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
      <ArrowLeft class="w-4 h-4" /> Back (F1)
    </button>

    <!-- Header bar -->
    <div class="bg-[rgb(134,153,64)] text-white px-6 py-3 rounded-t-xl flex items-center justify-between">
      <h2 class="text-lg font-bold">{{ form.status || 'Pending' }}</h2>
      <div class="flex items-center gap-2">
        <button class="px-3 py-1.5 bg-green-700 hover:bg-green-800 rounded text-sm font-medium transition-colors" @click="toast.info('Combine Order coming soon')">Combine Order</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="router.push('/app/sales-order/new')">+ New Order (F4)</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="printPickingList">Picking List</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="toast.info('Print Special coming soon')">Print Special</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="printDeliveryOrder">Print Delivery Order</button>
      </div>
    </div>

    <!-- Form body -->
    <div class="bg-white border border-stone-200 border-t-0 rounded-b-xl p-6">
      <!-- Row 1: SO No, Date, Credit Term, Credit Limit -->
      <div class="grid grid-cols-4 gap-4 mb-4">
        <div>
          <label class="block text-xs text-stone-500 mb-1">Sales Order No</label>
          <input :value="form.salesOrderNumber" readonly class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm" />
        </div>
        <div>
          <label class="block text-xs text-stone-500 mb-1">Date</label>
          <input v-model="form.deliveryDate" type="datetime-local" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        </div>
        <div>
          <label class="block text-xs text-stone-500 mb-1">Credit Term</label>
          <input :value="form.creditTerm" readonly class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm" />
        </div>
        <div>
          <label class="block text-xs text-stone-500 mb-1">Credit Limit</label>
          <input :value="form.creditLimit?.toFixed(3) ?? '0.000'" readonly class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm" />
        </div>
      </div>

      <!-- 2-column layout: Left (~55%) / Right (~45%) -->
      <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
        <!-- Customer Name (left) -->
        <div class="relative">
          <label class="block text-xs text-stone-500 mb-1">Customer Name</label>
          <input
            v-model="customerSearch"
            type="text"
            placeholder="Search by name, phone, company..."
            class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
            @input="searchCustomers"
          />
          <div v-if="customerResults.length" class="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            <button
              v-for="c in customerResults"
              :key="c.id"
              @click="selectCustomer(c)"
              class="w-full text-left px-3 py-2 text-sm hover:bg-stone-100 transition-colors"
            >
              <div class="font-medium text-stone-900">{{ c.companyName || c.name }}</div>
              <div class="text-xs text-stone-500">{{ c.phone }} {{ c.companyCode ? `(${c.companyCode})` : '' }} {{ c.branchLocation ? `· ${c.branchLocation}` : '' }}</div>
            </button>
          </div>
        </div>
        <!-- Country (right) -->
        <div>
          <label class="block text-xs text-stone-500 mb-1">Country</label>
          <div class="flex mt-1">
            <button type="button" @click="form.country = 'MY'" :class="['px-4 py-1.5 text-sm rounded-l-lg border transition-colors', form.country === 'MY' ? 'bg-[rgb(134,153,64)] text-white border-[rgb(134,153,64)]' : 'bg-stone-100 text-stone-600 border-stone-300']">Malaysia</button>
            <button type="button" @click="form.country = 'SG'" :class="['px-4 py-1.5 text-sm rounded-r-lg border border-l-0 transition-colors', form.country === 'SG' ? 'bg-[rgb(134,153,64)] text-white border-[rgb(134,153,64)]' : 'bg-stone-100 text-stone-600 border-stone-300']">Singapore</button>
          </div>
        </div>

        <!-- Branch (left) -->
        <div>
          <label class="block text-xs text-stone-500 mb-1">Branch</label>
          <input v-model="branchDisplay" readonly class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm" />
        </div>
        <!-- P/O Number + Invoice No (right, side by side) -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-stone-500 mb-1">P/O Number</label>
            <input v-model="form.poNumber" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
          </div>
          <div>
            <label class="block text-xs text-stone-500 mb-1">Invoice No</label>
            <input v-model="form.invoiceNumber" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
          </div>
        </div>

        <!-- Address (left, tall) -->
        <div class="row-span-2">
          <label class="block text-xs text-stone-500 mb-1">Address</label>
          <textarea v-model="form.deliveryAddress" rows="5" class="w-full h-[calc(100%-1.25rem)] bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 resize-none" />
        </div>
        <!-- Truck (right) -->
        <div>
          <label class="block text-xs text-stone-500 mb-1">Truck</label>
          <select v-model="form.truck" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
            <option value="">-- Select Truck --</option>
            <option v-for="t in trucks" :key="t.id" :value="t.code">{{ t.code }} {{ t.description ? `- ${t.description}` : '' }}</option>
          </select>
        </div>
        <!-- Deliver Remark + Basket + Box (right, same row) -->
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-xs text-stone-500 mb-1">Delivery Remark</label>
            <select v-model="form.deliverySlot" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
              <option value="TOMORROW_MORNING">Tomorrow Morning</option>
              <option value="AFTERNOON">Afternoon</option>
              <option value="MORNING">Morning</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-stone-500 mb-1">Basket</label>
            <input v-model.number="form.basket" type="number" min="0" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
          </div>
          <div>
            <label class="block text-xs text-stone-500 mb-1">Box</label>
            <input v-model.number="form.box" type="number" min="0" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
          </div>
        </div>

        <!-- Note (left) -->
        <div>
          <label class="block text-xs text-stone-500 mb-1">Note</label>
          <textarea v-model="form.notes" rows="3" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 resize-none" />
        </div>
        <!-- Status (right) -->
        <div>
          <label class="block text-xs text-stone-500 mb-1">Status</label>
          <select v-model="form.status" class="w-full bg-[rgb(238,238,204)] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
            <option value="PENDING">Pending</option>
            <option value="AWAITING_SHIPMENT">Awaiting Shipment</option>
            <option value="COMPLETED">Completed (Sync to SQL Accounting)</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Product Table -->
      <div class="border-t border-stone-200 pt-6">
        <div class="flex items-center justify-end gap-3 mb-3">
          <BaseButton variant="secondary" size="sm" @click="recalculatePrices">
            <RefreshCw class="w-4 h-4 mr-1" /> Recalculate Prices
          </BaseButton>
          <BaseButton variant="primary" size="sm" @click="openItemModal()">
            <Plus class="w-4 h-4 mr-1" /> Add New Product
          </BaseButton>
        </div>

        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[rgb(134,153,64)] text-white">
              <th class="px-3 py-2 text-left font-medium w-12">No</th>
              <th class="px-3 py-2 text-left font-medium w-16">Image</th>
              <th class="px-3 py-2 text-left font-medium">Product Code - Product Name</th>
              <th class="px-3 py-2 text-left font-medium w-28">2nd Desc</th>
              <th class="px-3 py-2 text-left font-medium w-24">Remark</th>
              <th class="px-3 py-2 text-right font-medium w-20">Qty</th>
              <th class="px-3 py-2 text-center font-medium w-20">UOM</th>
              <th class="px-3 py-2 text-right font-medium w-24">Unit Price</th>
              <th class="px-3 py-2 text-right font-medium w-24">Price</th>
              <th class="px-3 py-2 text-center font-medium w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in form.items" :key="idx" class="border-b border-stone-100 hover:bg-stone-50">
              <td class="px-3 py-2.5 text-stone-600">{{ idx + 1 }}</td>
              <td class="px-3 py-2.5">
                <img v-if="item.imageUrl" :src="item.imageUrl" class="w-10 h-10 rounded object-cover" />
                <div v-else class="w-10 h-10 rounded bg-stone-100 flex items-center justify-center">
                  <ImageIcon class="w-4 h-4 text-stone-400" />
                </div>
              </td>
              <td class="px-3 py-2.5 text-stone-900 font-medium">{{ item.itemCode ? `${item.itemCode} - ` : '' }}{{ item.description }}</td>
              <td class="px-3 py-2.5 text-stone-600">{{ item.secondDescription || '' }}</td>
              <td class="px-3 py-2.5 text-stone-600">{{ item.remark || '' }}</td>
              <td class="px-3 py-2.5 text-right text-stone-900">{{ Number(item.quantity).toFixed(2) }}</td>
              <td class="px-3 py-2.5 text-center text-stone-600">{{ item.unit }}</td>
              <td class="px-3 py-2.5 text-right text-stone-900">{{ Number(item.unitPrice).toFixed(2) }}</td>
              <td class="px-3 py-2.5 text-right text-stone-900 font-medium">{{ lineTotal(item) }}</td>
              <td class="px-3 py-2.5 text-center">
                <button @click="openItemModal(idx)" class="p-1 text-stone-400 hover:text-blue-600 transition-colors">
                  <Pencil class="w-4 h-4" />
                </button>
                <button @click="form.items.splice(idx, 1)" class="p-1 text-stone-400 hover:text-red-500 transition-colors">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr v-if="!form.items.length">
              <td colspan="10" class="text-center py-8 text-stone-400">No items added yet. Click "+ Add New Product" to start.</td>
            </tr>
          </tbody>
        </table>

        <!-- Totals -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-stone-200">
          <div class="flex gap-8 text-sm">
            <div>
              <span class="text-stone-500">Total Item</span>
              <div class="font-bold text-stone-900 text-lg">{{ form.items.length }}</div>
            </div>
            <div>
              <span class="text-stone-500">Total Qty</span>
              <div class="font-bold text-stone-900 text-lg">{{ totalQtyKg }} KG</div>
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-sm text-stone-500">Order Discount</span>
              <input v-model.number="form.discountAmount" type="number" min="0" step="0.01" class="w-24 bg-stone-100 border border-stone-300 rounded px-2 py-1 text-right text-sm" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-stone-500">Total</span>
              <input :value="grandTotal" readonly class="w-28 bg-stone-100 border border-stone-300 rounded px-2 py-1 text-right text-sm font-bold" />
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom buttons -->
      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-200">
        <BaseButton variant="primary" :loading="saving" @click="handleSubmit">{{ isEdit ? 'Update' : 'Create' }}</BaseButton>
        <BaseButton variant="secondary" @click="router.push('/app/sales-order')">Close</BaseButton>
      </div>
    </div>

    <!-- Edit Item Modal -->
    <EditItemModal
      v-model="itemModalOpen"
      :edit-index="editingItemIdx"
      :existing-item="editingItem"
      :customer-id="form.customerId"
      @save="onItemSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesOrderStore } from '../../stores/salesOrders'
import { useToast } from '../../composables/useToast'
import { useUnsavedChanges } from '../../composables/useUnsavedChanges'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import EditItemModal from '../../components/sales-orders/EditItemModal.vue'
import { generatePickingListPdf, generateDeliveryOrderPdf } from '../../lib/sales-order-pdf'
import { ArrowLeft, Plus, Trash2, Pencil, RefreshCw, ImageIcon } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useSalesOrderStore()
const toast = useToast()
const { markDirty, markClean } = useUnsavedChanges()
const saving = ref(false)

const isEdit = computed(() => !!route.params.id)

import type { FormItem } from '../../types'

const form = reactive({
  salesOrderNumber: '',
  customerId: '' as string,
  customerName: '',
  customerCompanyName: '',
  customerCompanyCode: '',
  customerPhone: '',
  customerEmail: '',
  customerBranchLocation: '',
  customerBranchCode: '',
  deliveryDate: '',
  deliverySlot: 'TOMORROW_MORNING',
  deliveryAddress: '',
  truck: '',
  poNumber: '',
  invoiceNumber: '',
  notes: '',
  discountAmount: 0,
  creditTerm: '',
  creditLimit: 0 as number | null,
  country: 'MY',
  basket: 0,
  box: 0,
  status: 'PENDING' as string,
  items: [] as FormItem[],
})

watch(form, () => markDirty(), { deep: true })

const branchDisplay = computed(() => {
  if (form.customerBranchCode && form.customerBranchLocation) {
    return `[${form.customerBranchCode}] ${form.customerBranchLocation} (${form.customerBranchCode})`
  }
  return form.customerBranchLocation || ''
})

// Customer search
const customerSearch = ref('')
const customerResults = ref<any[]>([])
let searchTimeout: ReturnType<typeof setTimeout>

function searchCustomers() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!customerSearch.value || customerSearch.value.length < 2) {
      customerResults.value = []
      return
    }
    try {
      const { data } = await api.get('/customers', { params: { search: customerSearch.value, limit: '10' } })
      customerResults.value = data.data
    } catch {
      customerResults.value = []
    }
  }, 300)
}

function selectCustomer(c: any) {
  form.customerId = c.id
  form.customerName = c.name || ''
  form.customerCompanyName = c.companyName || ''
  form.customerCompanyCode = c.companyCode || ''
  form.customerPhone = c.phone || ''
  form.customerEmail = c.email || ''
  form.customerBranchLocation = c.branchLocation || ''
  form.customerBranchCode = c.branchCode || ''
  form.deliveryAddress = c.address || ''
  form.creditTerm = c.creditTerms || ''
  form.creditLimit = c.creditLimit ? Number(c.creditLimit) : 0
  form.country = c.country || 'MY'
  customerSearch.value = c.companyName || c.name || ''
  customerResults.value = []
}

// Trucks
const trucks = ref<any[]>([])
onMounted(async () => {
  try {
    const { data } = await api.get('/trucks', { params: { limit: 500 } })
    trucks.value = data.data || []
  } catch { /* ignore */ }
})

// Item modal
const itemModalOpen = ref(false)
const editingItemIdx = ref<number | null>(null)
const editingItem = ref<FormItem | null>(null)

function openItemModal(idx?: number) {
  if (idx !== undefined) {
    editingItemIdx.value = idx
    editingItem.value = { ...form.items[idx] }
  } else {
    editingItemIdx.value = null
    editingItem.value = null
  }
  itemModalOpen.value = true
}

function onItemSave(item: FormItem) {
  if (editingItemIdx.value !== null) {
    form.items[editingItemIdx.value] = item
  } else {
    form.items.push(item)
  }
  itemModalOpen.value = false
}

// Calculations
function lineTotal(item: FormItem): string {
  const sub = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100)
  const tax = sub * ((item.taxRate || 0) / 100)
  return (sub + tax).toFixed(2)
}

const totalQtyKg = computed(() => {
  return form.items.reduce((sum, i) => sum + Number(i.quantity), 0).toFixed(3)
})

const grandTotal = computed(() => {
  const sub = form.items.reduce((sum, i) => {
    const s = i.quantity * i.unitPrice * (1 - (i.discountPercent || 0) / 100)
    const t = s * ((i.taxRate || 0) / 100)
    return sum + s + t
  }, 0)
  return (sub - (form.discountAmount || 0)).toFixed(2)
})

async function recalculatePrices() {
  let updated = 0
  const itemsWithStock = form.items.filter(i => i.stockItemId)
  const results = await Promise.allSettled(
    itemsWithStock.map(item => store.fetchStockUomVariants(item.stockItemId!))
  )
  results.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return
    const item = itemsWithStock[idx]
    const match = result.value.find(v => v.uomCode === item.unit)
    if (match && Number(match.price) !== item.unitPrice) {
      item.unitPrice = Number(match.price)
      updated++
    }
  })
  toast.success(`${updated} price(s) updated`)
}

// PDF
async function printPickingList() {
  if (!isEdit.value) return toast.error('Save the order first')
  const order = await store.getSalesOrder(route.params.id as string)
  generatePickingListPdf(order)
}
async function printDeliveryOrder() {
  if (!isEdit.value) return toast.error('Save the order first')
  const order = await store.getSalesOrder(route.params.id as string)
  generateDeliveryOrderPdf(order)
}

// Submit
async function handleSubmit() {
  if (!form.deliveryDate || !form.deliverySlot) {
    toast.error('Delivery date and slot are required')
    return
  }
  if (!form.items.length) {
    toast.error('Add at least one item')
    return
  }

  saving.value = true
  try {
    const payload = {
      customerId: form.customerId || null,
      deliveryDate: form.deliveryDate,
      deliverySlot: form.deliverySlot,
      deliveryAddress: form.deliveryAddress,
      truck: form.truck,
      poNumber: form.poNumber,
      invoiceNumber: form.invoiceNumber,
      notes: form.notes,
      discountAmount: form.discountAmount,
      creditTerm: form.creditTerm,
      creditLimit: form.creditLimit,
      country: form.country,
      basket: form.basket,
      box: form.box,
      deliverRemark: form.deliverySlot,
      status: form.status,
      items: form.items.map((i) => ({
        stockItemId: i.stockItemId || null,
        itemCode: i.itemCode || null,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
        taxRate: i.taxRate,
        notes: i.notes || null,
        secondDescription: i.secondDescription || null,
        remark: i.remark || null,
        imageUrl: i.imageUrl || null,
        foc: i.foc || false,
        processing: i.processing || null,
      })),
    }

    if (isEdit.value) {
      await store.updateSalesOrder(route.params.id as string, payload)
      toast.success('Sales order updated')
    } else {
      await store.createSalesOrder(payload)
      toast.success('Sales order created')
    }
    markClean()
    router.push('/app/sales-order')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

// Load existing order
onMounted(async () => {
  if (isEdit.value) {
    try {
      const order = await store.getSalesOrder(route.params.id as string)
      form.salesOrderNumber = order.salesOrderNumber
      form.customerId = order.customerId || ''
      form.customerName = order.customerName || ''
      form.customerCompanyName = order.customerCompanyName || ''
      form.customerCompanyCode = order.customerCompanyCode || ''
      form.customerPhone = order.customerPhone || ''
      form.customerEmail = order.customerEmail || ''
      form.customerBranchLocation = order.customerBranchLocation || ''
      form.customerBranchCode = order.customerBranchCode || ''
      form.deliveryDate = order.deliveryDate?.slice(0, 16) || ''
      form.deliverySlot = order.deliverySlot
      form.deliveryAddress = order.deliveryAddress || ''
      form.truck = order.truck || ''
      form.poNumber = order.poNumber || ''
      form.invoiceNumber = order.invoiceNumber || ''
      form.notes = order.notes || ''
      form.discountAmount = Number(order.discountAmount)
      form.creditTerm = order.creditTerm || ''
      form.creditLimit = order.creditLimit ? Number(order.creditLimit) : 0
      form.country = order.country || 'MY'
      form.basket = order.basket || 0
      form.box = order.box || 0
      form.status = order.status
      customerSearch.value = order.customerCompanyName || order.customerName || ''
      form.items = (order.items || []).map((i) => ({
        stockItemId: i.stockItemId,
        itemCode: i.itemCode,
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent),
        taxRate: Number(i.taxRate),
        notes: i.notes,
        secondDescription: i.secondDescription,
        remark: i.remark,
        imageUrl: i.imageUrl || i.stockItem?.imageUrl,
        foc: i.foc || false,
        processing: i.processing,
      }))
    } catch {
      toast.error('Failed to load order')
      router.push('/app/sales-order')
    }
  }
})

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'F1') { e.preventDefault(); router.push('/app/sales-order') }
  if (e.key === 'F4') { e.preventDefault(); router.push('/app/sales-order/new') }
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>
