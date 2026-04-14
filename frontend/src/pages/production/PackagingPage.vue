<template>
  <div class="flex h-[calc(100vh-6rem)] gap-4">
    <!-- Left rail -->
    <aside class="w-72 bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
      <div class="p-3 border-b border-stone-200 flex items-center gap-2">
        <input type="date" v-model="date" class="flex-1 rounded-lg border border-stone-200 text-sm px-2 py-1" />
        <button @click="refresh" class="text-stone-500 hover:text-stone-900"><RefreshCw class="w-4 h-4" /></button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <button
          v-for="o in queue"
          :key="o.id"
          @click="select(o.id)"
          :class="['w-full text-left px-3 py-3 border-b border-stone-100 hover:bg-stone-50', selectedId === o.id ? 'bg-green-50 border-l-4 border-l-green-600' : '']"
        >
          <div class="flex items-center justify-between">
            <span class="font-mono text-sm font-semibold">{{ o.orderNumber }}</span>
            <span :class="['text-[10px] px-1.5 py-0.5 rounded', o.deliverySlot === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700']">{{ o.deliverySlot }}</span>
          </div>
          <div class="text-sm text-stone-700">{{ o.contactName }}</div>
          <div class="text-xs text-stone-500 mt-0.5">{{ (o.lines?.length || 0) }} items · {{ o.status }}</div>
        </button>
        <div v-if="!queue.length" class="text-sm text-stone-400 text-center py-10">No orders in queue.</div>
      </div>
    </aside>

    <!-- Right pane -->
    <section class="flex-1 bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col">
      <div v-if="!current" class="flex-1 flex items-center justify-center text-stone-400 text-lg">Select an order</div>
      <template v-else>
        <div class="p-4 border-b border-stone-200 flex items-center gap-3">
          <div class="flex-1">
            <h2 class="text-xl font-mono font-semibold">{{ current.orderNumber }}</h2>
            <p class="text-sm text-stone-600">{{ current.contactName }} · {{ current.deliverySlot }} · {{ fmtDate(current.deliveryDate) }}</p>
          </div>
          <button @click="openPrint" class="border border-stone-300 rounded-lg px-3 py-2 text-sm flex items-center gap-1.5">
            <Printer class="w-4 h-4" /> Print Pack Sheet
          </button>
        </div>

        <!-- Shortage banner -->
        <div v-if="shortages && shortages.length" class="bg-red-50 border-l-4 border-red-400 p-3 m-4 rounded">
          <p class="text-sm font-semibold text-red-700">Insufficient stock — cannot advance</p>
          <ul class="text-xs text-red-700 mt-1 list-disc ml-5">
            <li v-for="s in shortages" :key="s.stockItemId">{{ s.itemName }} — need {{ s.required }}, have {{ s.available }}</li>
          </ul>
          <button @click="retry" class="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded">Restock and retry</button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            v-for="l in current.lines || []"
            :key="l.id"
            @click="tapLine(l)"
            :class="[
              'rounded-xl border-2 p-4 flex items-center gap-4 cursor-pointer select-none transition-colors',
              l.packed ? 'bg-green-50 border-green-400' : l.picked ? 'bg-amber-50 border-amber-400' : 'bg-white border-stone-200 hover:border-stone-400'
            ]"
          >
            <div class="w-16 h-16 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
              <img v-if="l.stockItem?.imageUrl" :src="l.stockItem.imageUrl" class="w-full h-full object-cover" />
              <Package v-else class="w-8 h-8 text-stone-400" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-lg font-semibold text-stone-900">{{ l.itemName }}</div>
              <div class="text-sm text-stone-600">
                <span class="font-medium text-stone-900">{{ l.quantity }} {{ l.unit }}</span>
                <span v-if="l.cutStyle" class="ml-2 inline-block bg-stone-200 text-stone-700 px-2 py-0.5 rounded text-xs">{{ l.cutStyle }}</span>
              </div>
              <div v-if="l.notes" class="text-sm text-stone-600 italic mt-1">"{{ l.notes }}"</div>
            </div>
            <div class="flex flex-col items-center gap-1">
              <Check :class="['w-8 h-8', l.picked ? 'text-amber-600' : 'text-stone-300']" />
              <CheckCheck :class="['w-8 h-8', l.packed ? 'text-green-600' : 'text-stone-300']" />
            </div>
          </div>
        </div>

        <div v-if="toast" class="p-3 border-t border-stone-200 bg-green-50 text-green-800 text-sm text-center">
          {{ toast }}
        </div>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RefreshCw, Printer, Check, CheckCheck, Package } from 'lucide-vue-next'
import { useProductionStore } from '../../stores/production'
import type { ShopOrder, ShopOrderLine } from '../../types'

const store = useProductionStore()
const date = ref(new Date().toISOString().slice(0, 10))
const selectedId = ref<string | null>(null)
const current = ref<ShopOrder | null>(null)
const shortages = ref<any[] | null>(null)
const toast = ref('')
let poller: any = null

const queue = computed(() => store.packQueue)

async function refresh() {
  await store.fetchPackQueue(date.value)
  if (selectedId.value && !queue.value.find((o) => o.id === selectedId.value)) {
    selectedId.value = null
    current.value = null
  }
}

async function select(id: string) {
  selectedId.value = id
  current.value = await store.fetchOrderDetail(id)
  shortages.value = null
}

async function tapLine(l: ShopOrderLine) {
  if (!current.value) return
  try {
    if (!l.picked) {
      await store.markPicked(current.value.id, l.id)
    } else if (!l.packed) {
      const result = await store.markPacked(current.value.id, l.id)
      if (result?.transitioned) {
        toast.value = `Order ${current.value.orderNumber} ready for delivery`
        setTimeout(() => (toast.value = ''), 3000)
        await refresh()
        selectedId.value = null
        current.value = null
        return
      }
    } else {
      // already packed, toggle off packed
      await store.markPacked(current.value.id, l.id)
    }
    current.value = await store.fetchOrderDetail(current.value.id)
  } catch (err: any) {
    if (err?.response?.data?.error === 'INSUFFICIENT_STOCK') {
      shortages.value = err.response.data.shortages
    } else {
      alert(err?.response?.data?.message || 'Action failed')
    }
  }
}

async function retry() {
  shortages.value = null
  if (current.value) current.value = await store.fetchOrderDetail(current.value.id)
}

function openPrint() {
  if (!current.value) return
  window.open(`/app/production/orders/${current.value.id}/pack-sheet/print`, '_blank')
}

function fmtDate(d: string) { try { return new Date(d).toLocaleDateString() } catch { return d } }

watch(date, refresh)

onMounted(() => {
  refresh()
  poller = setInterval(refresh, 30000)
})
onUnmounted(() => { if (poller) clearInterval(poller) })
</script>
