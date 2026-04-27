<template>
  <div v-if="order">
    <button @click="$router.push('/app/sales-order')" class="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
      <ArrowLeft class="w-4 h-4" /> Back
    </button>

    <!-- Header bar -->
    <div class="bg-[rgb(134,153,64)] text-white px-6 py-3 rounded-t-xl flex items-center justify-between">
      <h2 class="text-lg font-bold">Completed Sales Order</h2>
      <div class="flex items-center gap-2">
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="printPickingList">Picking List</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="toast.info('Print Special coming soon')">Print Special</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="printDeliveryOrder">Print Delivery Order</button>
      </div>
    </div>

    <!-- Form body (read-only) -->
    <div class="bg-white border border-stone-200 border-t-0 rounded-b-xl p-6">
      <div class="grid grid-cols-4 gap-4 mb-4">
        <Field label="Sales Order No" :value="order.salesOrderNumber" />
        <Field label="Date" :value="fmtDate(order.deliveryDate)" />
        <Field label="Credit Term" :value="order.creditTerm || '-'" />
        <Field label="Credit Limit" :value="order.creditLimit ? Number(order.creditLimit).toFixed(3) : '0.000'" />
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <Field label="Customer Name" :value="order.customerCompanyName || order.customerName || '-'" />
        <Field label="Country" :value="order.country === 'SG' ? 'Singapore' : 'Malaysia'" />
      </div>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <Field label="Branch" :value="order.customerBranchLocation || '-'" />
        <Field label="P/O Number" :value="order.poNumber || '-'" />
        <Field label="Invoice No" :value="order.invoiceNumber || '-'" />
      </div>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label class="block text-xs text-stone-500 mb-1">Address</label>
          <div class="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 min-h-[60px]">{{ order.deliveryAddress || '-' }}</div>
        </div>
        <Field label="Truck" :value="order.truck || '-'" />
        <div class="grid grid-cols-2 gap-4">
          <Field label="Basket" :value="String(order.basket || 0)" />
          <Field label="Box" :value="String(order.box || 0)" />
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <div></div>
        <Field label="Deliver Remark" :value="slotLabel(order.deliverySlot)" />
        <div></div>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-xs text-stone-500 mb-1">Note</label>
          <div class="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 min-h-[60px]">{{ order.notes || '-' }}</div>
        </div>
        <Field label="Status" :value="statusLabel(order.status)" />
      </div>

      <!-- Product Table -->
      <div class="border-t border-stone-200 pt-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-[rgb(134,153,64)] text-white">
              <th class="px-3 py-2 text-left font-medium w-12">No</th>
              <th class="px-3 py-2 text-left font-medium w-16">Image</th>
              <th class="px-3 py-2 text-left font-medium">Product Code</th>
              <th class="px-3 py-2 text-left font-medium">Description</th>
              <th class="px-3 py-2 text-left font-medium w-28">2nd Description</th>
              <th class="px-3 py-2 text-left font-medium w-24">Remark</th>
              <th class="px-3 py-2 text-right font-medium w-16">Qty</th>
              <th class="px-3 py-2 text-center font-medium w-20">UOM</th>
              <th class="px-3 py-2 text-right font-medium w-24">Unit Price</th>
              <th class="px-3 py-2 text-right font-medium w-24">Price</th>
              <th class="px-3 py-2 text-center font-medium w-14">FOC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in order.items" :key="item.id" class="border-b border-stone-100">
              <td class="px-3 py-2.5 text-stone-600">{{ idx + 1 }}</td>
              <td class="px-3 py-2.5">
                <img v-if="item.imageUrl || item.stockItem?.imageUrl" :src="item.imageUrl || item.stockItem?.imageUrl" class="w-10 h-10 rounded object-cover" />
                <div v-else class="w-10 h-10 rounded bg-stone-100 flex items-center justify-center">
                  <ImageIcon class="w-4 h-4 text-stone-400" />
                </div>
              </td>
              <td class="px-3 py-2.5 text-stone-900 font-medium">{{ item.itemCode || '-' }}</td>
              <td class="px-3 py-2.5 text-stone-900">{{ item.description }}</td>
              <td class="px-3 py-2.5 text-stone-600">{{ item.secondDescription || '' }}</td>
              <td class="px-3 py-2.5 text-stone-600">{{ item.remark || '' }}</td>
              <td class="px-3 py-2.5 text-right text-stone-900">{{ Number(item.quantity).toFixed(2) }}</td>
              <td class="px-3 py-2.5 text-center text-stone-600">{{ item.unit }}</td>
              <td class="px-3 py-2.5 text-right text-stone-900">{{ Number(item.unitPrice).toFixed(2) }}</td>
              <td class="px-3 py-2.5 text-right text-stone-900 font-medium">{{ Number(item.total).toFixed(2) }}</td>
              <td class="px-3 py-2.5 text-center">{{ item.foc ? 'Y' : '' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="flex items-center justify-between mt-4 pt-4 border-t border-stone-200">
          <div class="flex gap-8 text-sm">
            <div>
              <span class="text-stone-500">Total Item</span>
              <div class="font-bold text-stone-900 text-lg">{{ order.items?.length || 0 }}</div>
            </div>
            <div>
              <span class="text-stone-500">Total Qty</span>
              <div class="font-bold text-stone-900 text-lg">{{ totalQtyKg }} KG</div>
            </div>
          </div>
          <div class="flex items-center gap-6 text-sm">
            <div><span class="text-stone-500">Order Discount:</span> <span class="font-medium">{{ Number(order.discountAmount).toFixed(2) }}</span></div>
            <div><span class="text-stone-500">Total:</span> <span class="font-bold text-lg">{{ Number(order.totalAmount).toFixed(2) }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center py-12 text-stone-400">Loading...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesOrderStore } from '../../stores/salesOrders'
import { useToast } from '../../composables/useToast'
import { generatePickingListPdf, generateDeliveryOrderPdf } from '../../lib/sales-order-pdf'
import type { SalesOrder } from '../../types'
import { ArrowLeft, ImageIcon } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useSalesOrderStore()
const toast = useToast()
const order = ref<SalesOrder | null>(null)

const totalQtyKg = computed(() => {
  return (order.value?.items || []).reduce((sum, i) => sum + Number(i.quantity), 0).toFixed(3)
})

function fmtDate(d: string) {
  try { return new Date(d).toLocaleString('en-MY') } catch { return d }
}

function slotLabel(s: string) {
  switch (s) {
    case 'AFTERNOON': return 'Afternoon'
    case 'TOMORROW_MORNING': return 'Tomorrow Morning'
    case 'MORNING': return 'Morning'
    default: return s
  }
}

function statusLabel(s: string) {
  switch (s) {
    case 'PENDING': return 'Pending'
    case 'AWAITING_SHIPMENT': return 'Awaiting Shipment'
    case 'COMPLETED': return 'Completed (Sync to SQL Accounting)'
    case 'CANCELLED': return 'Cancelled'
    default: return s
  }
}

async function printPickingList() {
  if (order.value) generatePickingListPdf(order.value)
}
async function printDeliveryOrder() {
  if (order.value) generateDeliveryOrderPdf(order.value)
}

onMounted(async () => {
  try {
    order.value = await store.getSalesOrder(route.params.id as string)
  } catch {
    toast.error('Failed to load order')
    router.push('/app/sales-order')
  }
})

// Read-only field component
const Field = {
  props: { label: String, value: String },
  template: `<div><label class="block text-xs text-stone-500 mb-1">{{ label }}</label><div class="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700">{{ value }}</div></div>`,
}
</script>
