<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div v-if="loading" class="text-center text-stone-500 py-20">Loading...</div>
    <div v-else-if="!order" class="text-center text-stone-500 py-20">Order not found.</div>
    <div v-else class="bg-white rounded-3xl border border-stone-200 p-8 text-center">
      <div class="w-16 h-16 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center">
        <CheckCircle class="w-10 h-10" />
      </div>
      <h1 class="text-2xl font-semibold text-stone-800 mt-4">Thanks, your order is placed!</h1>
      <p class="text-stone-500 mt-1">Order <span class="font-mono font-semibold">{{ order.orderNumber }}</span></p>

      <div class="grid sm:grid-cols-2 gap-4 mt-6 text-left text-sm">
        <div class="bg-cream rounded-xl p-4">
          <div class="text-xs text-stone-500 uppercase">Delivery</div>
          <div class="mt-1">{{ formatDate(order.deliveryDate) }} · {{ order.deliverySlot }}</div>
          <div class="text-stone-600">{{ order.deliveryAddress }}</div>
        </div>
        <div class="bg-cream rounded-xl p-4">
          <div class="text-xs text-stone-500 uppercase">Contact</div>
          <div class="mt-1">{{ order.contactName }}</div>
          <div class="text-stone-600">{{ order.contactPhone }}</div>
        </div>
      </div>

      <div class="mt-6 text-left">
        <h3 class="font-semibold mb-2">Items</h3>
        <div class="space-y-1 text-sm">
          <div v-for="l in order.lines" :key="l.id" class="flex justify-between">
            <span>{{ l.itemName }} <span class="text-stone-400">× {{ l.quantity }} {{ l.unit }}</span></span>
            <span>RM {{ Number(l.lineTotal).toFixed(2) }}</span>
          </div>
        </div>
        <div class="flex justify-between font-semibold border-t border-stone-200 mt-3 pt-2">
          <span>Total</span>
          <span class="text-olive">RM {{ Number(order.total).toFixed(2) }}</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-3 justify-center mt-6">
        <RouterLink :to="`/track?orderNumber=${order.orderNumber}&phone=${order.contactPhone}`" class="bg-olive text-white rounded-full px-6 py-2.5 text-sm">Track this order</RouterLink>
        <button v-if="order.invoiceId" :disabled="downloadingInvoice" @click="downloadInvoice" class="border border-olive text-olive rounded-full px-6 py-2.5 text-sm disabled:opacity-50">
          {{ downloadingInvoice ? 'Preparing...' : 'Download Invoice (PDF)' }}
        </button>
        <RouterLink to="/shop" class="border border-olive text-olive rounded-full px-6 py-2.5 text-sm">Continue shopping</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { CheckCircle } from 'lucide-vue-next'
import { useShopStore } from '../../stores/shop'
import { downloadShopInvoicePdf } from '../../lib/shop-invoice-pdf'
import type { ShopOrder } from '../../types'

const route = useRoute()
const shop = useShopStore()
const order = ref<ShopOrder | null>(null)
const loading = ref(true)
const downloadingInvoice = ref(false)

async function downloadInvoice() {
  if (!order.value) return
  downloadingInvoice.value = true
  try {
    const inv = await shop.fetchOrderInvoice(order.value.orderNumber, order.value.contactPhone)
    downloadShopInvoicePdf(inv)
  } catch (err) {
    console.error(err)
    alert('Could not download invoice. Please try again later.')
  } finally {
    downloadingInvoice.value = false
  }
}

onMounted(async () => {
  const orderNumber = route.params.orderNumber as string
  // Try looking up using stored customer phone or query
  const phone = (route.query.phone as string) || prompt('Enter phone used for order:') || ''
  try {
    order.value = await shop.trackOrder(orderNumber, phone)
  } catch { /* noop */ } finally { loading.value = false }
})

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString() } catch { return d }
}
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.border-olive { border-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
.bg-cream { background-color: #f5ebe2; }
</style>
