<template>
  <div class="max-w-4xl">
    <div v-if="!order" class="text-stone-500">Loading...</div>
    <div v-else>
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-xl font-semibold font-mono">{{ order.orderNumber }}</h1>
          <p class="text-xs text-stone-500">{{ new Date(order.createdAt).toLocaleString() }}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap justify-end">
          <select v-model="newStatus" class="rounded-lg border-stone-200 text-sm">
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
          <button class="bg-green-600 text-white rounded-lg px-4 py-2 text-sm" @click="changeStatus">Update</button>
          <RouterLink v-if="order.invoice" :to="`/app/documents/${order.invoice.id}`" class="border border-olive text-olive rounded-lg px-4 py-2 text-sm hover:bg-olive/5">
            View Invoice {{ order.invoice.documentNumber }}
          </RouterLink>
          <button v-else class="bg-olive text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50" :disabled="busyInvoice" @click="genInvoice">
            {{ busyInvoice ? 'Generating...' : 'Generate Invoice' }}
          </button>
          <RouterLink v-if="order.deliveryOrder" :to="`/app/documents/${order.deliveryOrder.id}`" class="border border-stone-400 text-stone-700 rounded-lg px-4 py-2 text-sm hover:bg-stone-50">
            View DO {{ order.deliveryOrder.documentNumber }}
          </RouterLink>
          <button v-else class="border border-stone-300 rounded-lg px-4 py-2 text-sm disabled:opacity-50" :disabled="busyDO || !canGenerateDO" @click="genDO">
            {{ busyDO ? 'Generating...' : 'Generate DO' }}
          </button>
        </div>
      </div>

      <!-- Linked Customer -->
      <div v-if="order.shopCustomer" class="mb-4 bg-white rounded-xl border border-stone-200 p-3 text-sm flex items-center justify-between">
        <div>
          <span class="text-xs text-stone-500 uppercase mr-2">Shop Customer</span>
          <span class="font-medium">{{ order.shopCustomer.name }}</span>
          <span class="text-stone-500 ml-2">{{ order.shopCustomer.phone }}</span>
        </div>
        <button v-if="!promotedCustomerId" class="text-xs text-olive hover:underline disabled:opacity-50" :disabled="busyPromote" @click="promote">
          {{ busyPromote ? 'Promoting...' : 'Promote to Customer record' }}
        </button>
        <span v-else class="text-xs text-green-700">Linked to Customer #{{ promotedCustomerId.slice(-6) }}</span>
      </div>

      <div class="grid md:grid-cols-2 gap-4 mb-4">
        <div class="bg-white rounded-xl border border-stone-200 p-4 text-sm">
          <div class="text-xs text-stone-500 uppercase mb-1">Contact</div>
          <div>{{ order.contactName }}</div>
          <div class="text-stone-500">{{ order.contactPhone }}</div>
          <div v-if="order.contactEmail" class="text-stone-500">{{ order.contactEmail }}</div>
        </div>
        <div class="bg-white rounded-xl border border-stone-200 p-4 text-sm">
          <div class="text-xs text-stone-500 uppercase mb-1">Delivery</div>
          <div>{{ formatDate(order.deliveryDate) }} · {{ order.deliverySlot }}</div>
          <div class="text-stone-500">{{ order.deliveryAddress }}</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-stone-50 text-xs text-stone-500 uppercase">
            <tr><th class="px-4 py-2 text-left">Item</th><th class="px-4 py-2 text-left">Cut</th><th class="px-4 py-2 text-right">Qty</th><th class="px-4 py-2 text-right">Unit</th><th class="px-4 py-2 text-right">Line</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in order.lines" :key="l.id" class="border-t border-stone-100">
              <td class="px-4 py-2">
                {{ l.itemName }}
                <span v-if="l.picked" class="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">picked</span>
                <span v-if="l.packed" class="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">packed</span>
              </td>
              <td class="px-4 py-2 text-stone-500">{{ l.cutStyle || '—' }}</td>
              <td class="px-4 py-2 text-right">{{ l.quantity }} {{ l.unit }}</td>
              <td class="px-4 py-2 text-right">RM {{ Number(l.unitPrice).toFixed(2) }}</td>
              <td class="px-4 py-2 text-right">RM {{ Number(l.lineTotal).toFixed(2) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-stone-200">
              <td colspan="4" class="px-4 py-2 text-right font-semibold">Total</td>
              <td class="px-4 py-2 text-right font-semibold">RM {{ Number(order.total).toFixed(2) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-if="order.notes" class="mt-4 text-sm">
        <div class="text-xs text-stone-500 uppercase mb-1">Notes</div>
        <p>{{ order.notes }}</p>
      </div>

      <div class="mt-6">
        <button class="text-sm text-red-600 hover:underline" @click="cancel">Cancel order (restore stock)</button>
      </div>

      <!-- Status timeline -->
      <div class="mt-8 bg-white rounded-xl border border-stone-200 p-4">
        <h3 class="text-xs font-semibold uppercase text-stone-500 mb-3">Status History</h3>
        <ol class="relative border-l border-stone-200 ml-2">
          <li v-for="log in order.statusLogs || []" :key="log.id" class="ml-4 pb-4">
            <div class="absolute w-2 h-2 bg-green-600 rounded-full -left-1 mt-1.5" />
            <div class="text-xs text-stone-500">{{ new Date(log.createdAt).toLocaleString() }}</div>
            <div class="text-sm">
              <span class="text-stone-500">{{ log.fromStatus || '—' }}</span>
              <span class="mx-1">→</span>
              <span class="font-medium text-stone-900">{{ log.toStatus }}</span>
            </div>
            <div v-if="log.changedBy" class="text-xs text-stone-500">by {{ log.changedBy.name }} ({{ log.changedBy.role }})</div>
            <div v-if="log.note" class="text-xs text-stone-600 italic">"{{ log.note }}"</div>
          </li>
          <li v-if="!(order.statusLogs || []).length" class="ml-4 text-xs text-stone-400">No history yet.</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useOrdersStore } from '../../stores/orders'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import type { OrderStatus, ShopOrder } from '../../types'

const route = useRoute()
const store = useOrdersStore()
const toast = useToast()
const confirm = useConfirm()
const order = ref<ShopOrder | null>(null)
const newStatus = ref<OrderStatus>('PENDING')
const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PICKING', 'CUTTING', 'PACKING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
const busyInvoice = ref(false)
const busyDO = ref(false)
const busyPromote = ref(false)
const promotedCustomerId = ref<string | null>(null)

const canGenerateDO = computed(() => {
  if (!order.value) return false
  return ['PACKING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.value.status)
})

async function load() {
  order.value = await store.fetchOrder(route.params.id as string)
  newStatus.value = order.value.status
}

onMounted(load)

async function changeStatus() {
  if (!order.value) return
  order.value = await store.updateStatus(order.value.id, newStatus.value)
}

async function cancel() {
  if (!order.value) return
  if (!(await confirm.show('Cancel Order', 'Cancel this order? Stock will be restored.', { confirmLabel: 'Cancel Order' }))) return
  order.value = await store.cancelOrder(order.value.id)
  newStatus.value = order.value.status
}

async function genInvoice() {
  if (!order.value) return
  busyInvoice.value = true
  try {
    const res = await store.generateInvoice(order.value.id)
    toast.success(`Invoice ${res.documentNumber} ${res.reused ? 'already exists' : 'generated'}`)
    await load()
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to generate invoice')
  } finally {
    busyInvoice.value = false
  }
}

async function genDO() {
  if (!order.value) return
  busyDO.value = true
  try {
    const res = await store.generateDeliveryOrder(order.value.id)
    toast.success(`Delivery Order ${res.documentNumber} ${res.reused ? 'already exists' : 'generated'}`)
    await load()
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to generate DO')
  } finally {
    busyDO.value = false
  }
}

async function promote() {
  if (!order.value) return
  busyPromote.value = true
  try {
    const res = await store.promoteCustomer(order.value.id)
    promotedCustomerId.value = res.customerId
    toast.success('Shop customer promoted to Customer record')
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Failed to promote customer')
  } finally {
    busyPromote.value = false
  }
}

function formatDate(d: string) { try { return new Date(d).toLocaleDateString() } catch { return d } }
</script>
