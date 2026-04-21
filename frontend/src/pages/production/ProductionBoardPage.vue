<template>
  <div>
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <h1 class="text-xl font-semibold text-stone-900">Production Board</h1>
      <input type="date" v-model="date" class="rounded-lg border border-stone-200 text-sm px-2 py-1" />
      <select v-model="slotFilter" class="rounded-lg border border-stone-200 text-sm px-2 py-1">
        <option value="">All slots</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
      <input v-model="search" type="text" placeholder="Search order/name..." class="rounded-lg border border-stone-200 text-sm px-2 py-1" />
      <label class="flex items-center gap-1.5 text-sm text-stone-600">
        <input type="checkbox" v-model="showCompleted" /> Show completed
      </label>
      <RouterLink to="/app/shop-display" target="_blank" class="ml-auto bg-stone-900 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5 hover:bg-stone-800">
        <Monitor class="w-4 h-4" /> Shop Display
      </RouterLink>
      <button @click="refresh" class="bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5">
        <RefreshCw class="w-4 h-4" /> Refresh
      </button>
    </div>

    <!-- Kanban columns -->
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <div
        v-for="col in mainColumns"
        :key="col.status"
        class="bg-white border border-stone-200 rounded-xl flex flex-col min-h-[60vh]"
      >
        <div :class="['px-3 py-2 rounded-t-xl text-xs font-semibold uppercase tracking-wider', col.headerClass]">
          {{ col.label }} <span class="ml-1 opacity-75">({{ visibleCards(col.status).length }})</span>
        </div>
        <div class="flex-1 p-2 space-y-2 overflow-y-auto">
          <div
            v-for="card in visibleCards(col.status)"
            :key="card.id"
            class="bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm cursor-pointer hover:border-green-600"
            @click="openDrawer(card.id)"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-stone-900 font-semibold">{{ card.orderNumber }}</span>
              <span :class="['text-xs px-1.5 py-0.5 rounded', card.deliverySlot === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700']">
                {{ card.deliverySlot }}
              </span>
            </div>
            <div class="text-stone-600 mt-1">{{ card.contactName }}</div>
            <div class="flex items-center justify-between mt-2 text-xs">
              <span class="text-stone-500">{{ card.lineCount }} items</span>
              <span class="text-stone-700 font-medium">RM {{ card.total.toFixed(2) }}</span>
            </div>
            <div class="flex gap-1 mt-2 flex-wrap">
              <span
                v-if="card.status === 'PENDING' && card.oldestPendingMinutes >= 120"
                class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded"
              >{{ card.oldestPendingMinutes }}m old</span>
              <span v-if="card.perishableCount > 0" class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                {{ card.perishableCount }} perishable
              </span>
            </div>
          </div>
          <div v-if="!visibleCards(col.status).length" class="text-xs text-stone-400 text-center py-6">—</div>
        </div>
      </div>
    </div>

    <!-- OUT_FOR_DELIVERY footer strip -->
    <div class="mt-4 bg-white border border-stone-200 rounded-xl p-3">
      <div class="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-2">Out for Delivery ({{ visibleCards('OUT_FOR_DELIVERY').length }})</div>
      <div class="flex gap-2 flex-wrap">
        <div
          v-for="card in visibleCards('OUT_FOR_DELIVERY')"
          :key="card.id"
          class="bg-stone-50 border border-stone-200 rounded px-3 py-1.5 text-xs cursor-pointer hover:border-green-600"
          @click="openDrawer(card.id)"
        >
          <span class="font-mono font-semibold">{{ card.orderNumber }}</span>
          <span class="text-stone-500 ml-2">{{ card.contactName }}</span>
        </div>
        <div v-if="!visibleCards('OUT_FOR_DELIVERY').length" class="text-xs text-stone-400">No orders out for delivery.</div>
      </div>
    </div>

    <!-- Drawer -->
    <div v-if="drawerOrderId" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-black/40" @click="drawerOrderId = null" />
      <div class="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
        <OrderDrawer :order-id="drawerOrderId" @close="closeDrawer" @changed="refresh" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { RefreshCw, Monitor } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { useProductionStore } from '../../stores/production'
import OrderDrawer from './OrderDrawer.vue'
import type { BoardCard, OrderStatus } from '../../types'

const store = useProductionStore()
const date = ref(new Date().toISOString().slice(0, 10))
const slotFilter = ref('')
const search = ref('')
const showCompleted = ref(false)
const drawerOrderId = ref<string | null>(null)
let poller: any = null

const mainColumns: Array<{ status: OrderStatus; label: string; headerClass: string }> = [
  { status: 'PENDING',   label: 'Pending',   headerClass: 'bg-stone-100 text-stone-700' },
  { status: 'CONFIRMED', label: 'Confirmed', headerClass: 'bg-blue-100 text-blue-700' },
  { status: 'PICKING',   label: 'Picking',   headerClass: 'bg-amber-100 text-amber-700' },
  { status: 'CUTTING',   label: 'Cutting',   headerClass: 'bg-orange-100 text-orange-700' },
  { status: 'PACKING',   label: 'Packing',   headerClass: 'bg-purple-100 text-purple-700' },
  { status: 'READY',     label: 'Ready',     headerClass: 'bg-green-100 text-green-700' },
]

function visibleCards(status: string): BoardCard[] {
  const list = (store.board[status] || []) as BoardCard[]
  const q = search.value.trim().toLowerCase()
  return list.filter((c) => {
    if (slotFilter.value && c.deliverySlot !== slotFilter.value) return false
    if (q && !c.orderNumber.toLowerCase().includes(q) && !c.contactName.toLowerCase().includes(q)) return false
    return true
  })
}

async function refresh() {
  await store.fetchBoard(date.value, showCompleted.value)
}

function openDrawer(id: string) {
  drawerOrderId.value = id
}
function closeDrawer() {
  drawerOrderId.value = null
}

watch([date, showCompleted], refresh)

onMounted(() => {
  refresh()
  poller = setInterval(refresh, 30000)
})
onUnmounted(() => {
  if (poller) clearInterval(poller)
})
</script>
