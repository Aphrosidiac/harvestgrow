<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <h1 class="text-2xl font-semibold text-olive mb-6">Track your order</h1>
    <form @submit.prevent="lookup" class="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
      <input v-model="orderNumber" required placeholder="Order number (e.g. HG-260414-0001)" class="input" />
      <input v-model="phone" required placeholder="Phone used for the order" class="input" />
      <button type="submit" :disabled="loading" class="w-full bg-olive text-white rounded-full py-2.5 font-medium">
        {{ loading ? 'Searching...' : 'Track order' }}
      </button>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </form>

    <div v-if="order" class="mt-6 bg-white rounded-2xl border border-stone-200 p-5">
      <div class="flex justify-between items-center mb-4">
        <div>
          <div class="font-mono font-semibold">{{ order.orderNumber }}</div>
          <div class="text-xs text-stone-500">Total RM {{ Number(order.total).toFixed(2) }} · COD</div>
        </div>
        <span class="text-xs font-semibold px-3 py-1 rounded-full bg-olive/10 text-olive">{{ order.status }}</span>
      </div>
      <ol class="relative border-l border-stone-200 ml-3 space-y-4">
        <li v-for="(s, i) in stages" :key="s" class="ml-4">
          <span
            class="absolute -left-2 w-4 h-4 rounded-full"
            :class="reachedIndex >= i ? 'bg-olive' : 'bg-stone-200'"
          />
          <div class="text-sm" :class="reachedIndex >= i ? 'text-stone-800 font-medium' : 'text-stone-400'">{{ s }}</div>
        </li>
      </ol>
      <div v-if="order.invoiceId" class="mt-5 pt-4 border-t border-stone-200">
        <button :disabled="downloadingInvoice" @click="downloadInvoice" class="w-full bg-olive text-white rounded-full py-2.5 text-sm font-medium disabled:opacity-50">
          {{ downloadingInvoice ? 'Preparing...' : 'Download Invoice (PDF)' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useShopStore } from '../../stores/shop'
import { downloadShopInvoicePdf } from '../../lib/shop-invoice-pdf'
import type { ShopOrder, OrderStatus } from '../../types'

const route = useRoute()
const shop = useShopStore()
const orderNumber = ref('')
const phone = ref('')
const order = ref<ShopOrder | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const downloadingInvoice = ref(false)

async function downloadInvoice() {
  if (!order.value) return
  downloadingInvoice.value = true
  try {
    const inv = await shop.fetchOrderInvoice(order.value.orderNumber, order.value.contactPhone)
    downloadShopInvoicePdf(inv)
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Invoice not available yet'
  } finally {
    downloadingInvoice.value = false
  }
}

const stages: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PICKING', 'CUTTING', 'PACKING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']

const reachedIndex = computed(() => {
  if (!order.value) return -1
  if (order.value.status === 'CANCELLED') return -1
  return stages.indexOf(order.value.status as OrderStatus)
})

async function lookup() {
  loading.value = true
  error.value = null
  try {
    order.value = await shop.trackOrder(orderNumber.value.trim(), phone.value.trim())
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Order not found'
    order.value = null
  } finally { loading.value = false }
}

onMounted(() => {
  const qn = route.query.orderNumber as string
  const qp = route.query.phone as string
  if (qn) orderNumber.value = qn
  if (qp) phone.value = qp
  if (qn && qp) lookup()
})
</script>

<style scoped>
@reference "../../assets/css/main.css";
.input { @apply w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30; }
.bg-olive { background-color: #6b7a3d; }
.border-olive { border-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
.bg-olive\/10 { background-color: rgba(107, 122, 61, 0.1); }
</style>
