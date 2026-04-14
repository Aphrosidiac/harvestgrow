<template>
  <div>
    <div class="flex flex-wrap items-end gap-3 mb-6">
      <div>
        <label class="text-xs text-stone-500">Status</label>
        <select v-model="status" class="block rounded-lg border-stone-200 text-sm">
          <option value="">All</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-stone-500">Delivery date</label>
        <input v-model="deliveryDate" type="date" class="block rounded-lg border-stone-200 text-sm" />
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="text-xs text-stone-500">Search</label>
        <input v-model="search" placeholder="Order #, name, phone" class="w-full rounded-lg border-stone-200 text-sm" />
      </div>
      <button class="bg-green-600 text-white rounded-lg px-4 py-2 text-sm" @click="reload">Apply</button>
    </div>

    <div class="bg-white rounded-xl border border-stone-200 overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-stone-50 text-xs text-stone-500 uppercase">
          <tr>
            <th class="px-4 py-3 text-left">Order #</th>
            <th class="px-4 py-3 text-left">Contact</th>
            <th class="px-4 py-3 text-left">Delivery</th>
            <th class="px-4 py-3 text-left">Slot</th>
            <th class="px-4 py-3 text-right">Total</th>
            <th class="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in store.orders" :key="o.id" class="border-t border-stone-100 hover:bg-stone-50 cursor-pointer" @click="view(o.id)">
            <td class="px-4 py-3 font-mono font-semibold">{{ o.orderNumber }}</td>
            <td class="px-4 py-3">{{ o.contactName }}<br /><span class="text-xs text-stone-500">{{ o.contactPhone }}</span></td>
            <td class="px-4 py-3">{{ formatDate(o.deliveryDate) }}</td>
            <td class="px-4 py-3">{{ o.deliverySlot }}</td>
            <td class="px-4 py-3 text-right">RM {{ Number(o.total).toFixed(2) }}</td>
            <td class="px-4 py-3"><span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="chip(o.status)">{{ o.status }}</span></td>
          </tr>
          <tr v-if="!store.loading && store.orders.length === 0">
            <td colspan="6" class="px-4 py-10 text-center text-stone-500">No orders found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOrdersStore } from '../../stores/orders'
import type { OrderStatus } from '../../types'

const store = useOrdersStore()
const router = useRouter()
const status = ref('')
const deliveryDate = ref('')
const search = ref('')

const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PICKING', 'CUTTING', 'PACKING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

async function reload() {
  await store.fetchOrders({
    ...(status.value && { status: status.value }),
    ...(deliveryDate.value && { deliveryDate: deliveryDate.value }),
    ...(search.value && { search: search.value }),
  })
}

onMounted(reload)

function view(id: string) { router.push(`/app/orders/${id}`) }
function formatDate(d: string) { try { return new Date(d).toLocaleDateString() } catch { return d } }

function chip(s: string) {
  switch (s) {
    case 'PENDING': return 'bg-amber-100 text-amber-700'
    case 'CONFIRMED': return 'bg-blue-100 text-blue-700'
    case 'PICKING': case 'CUTTING': case 'PACKING': return 'bg-purple-100 text-purple-700'
    case 'READY': case 'OUT_FOR_DELIVERY': return 'bg-indigo-100 text-indigo-700'
    case 'DELIVERED': return 'bg-green-100 text-green-700'
    case 'CANCELLED': return 'bg-red-100 text-red-700'
    default: return 'bg-stone-100 text-stone-700'
  }
}
</script>
