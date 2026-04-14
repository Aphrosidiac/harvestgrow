<template>
  <div class="p-5">
    <div v-if="!order" class="text-stone-500 text-sm">Loading...</div>
    <div v-else>
      <div class="flex items-start justify-between mb-3">
        <div>
          <h2 class="font-mono text-lg font-semibold">{{ order.orderNumber }}</h2>
          <p class="text-xs text-stone-500">{{ order.contactName }} · {{ order.contactPhone }}</p>
          <p class="text-xs text-stone-500">{{ fmtDate(order.deliveryDate) }} · {{ order.deliverySlot }}</p>
        </div>
        <button class="text-stone-500 hover:text-stone-900" @click="$emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs font-semibold px-2 py-1 rounded bg-stone-100 text-stone-700">{{ order.status }}</span>
        <span class="text-xs text-stone-600">RM {{ Number(order.total).toFixed(2) }}</span>
      </div>

      <!-- Shortage banner -->
      <div v-if="shortages && shortages.length" class="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
        <p class="text-sm font-semibold text-red-700">Insufficient stock</p>
        <ul class="text-xs text-red-700 mt-1 list-disc ml-5">
          <li v-for="s in shortages" :key="s.stockItemId">{{ s.itemName }} — need {{ s.required }}, have {{ s.available }}</li>
        </ul>
      </div>

      <!-- Lines -->
      <div class="border border-stone-200 rounded-lg mb-3">
        <div v-for="l in order.lines" :key="l.id" class="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 border-stone-100 text-sm">
          <div class="flex-1">
            <div class="font-medium text-stone-900">{{ l.itemName }}</div>
            <div class="text-xs text-stone-500">
              {{ l.quantity }} {{ l.unit }}
              <span v-if="l.cutStyle"> · {{ l.cutStyle }}</span>
            </div>
            <div v-if="l.notes" class="text-xs text-stone-500 italic">"{{ l.notes }}"</div>
          </div>
          <div class="flex items-center gap-1 text-xs">
            <span :class="l.picked ? 'text-amber-600' : 'text-stone-300'" title="Picked">
              <Check class="w-4 h-4" />
            </span>
            <span :class="l.packed ? 'text-green-600' : 'text-stone-300'" title="Packed">
              <CheckCheck class="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      <!-- Transitions -->
      <div v-if="allowedTransitions.length" class="mb-3">
        <label class="text-xs text-stone-500 block mb-1">Note (optional)</label>
        <input v-model="note" type="text" class="w-full rounded-lg border border-stone-200 text-sm px-2 py-1 mb-2" />
        <div class="flex flex-wrap gap-2">
          <button
            v-for="t in allowedTransitions"
            :key="t"
            @click="advance(t)"
            class="bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs hover:bg-green-700"
          >
            → {{ t }}
          </button>
        </div>
      </div>

      <!-- Status timeline -->
      <div class="mt-4">
        <h3 class="text-xs font-semibold uppercase text-stone-500 mb-2">Status history</h3>
        <ol class="relative border-l border-stone-200 ml-2">
          <li v-for="log in order.statusLogs || []" :key="log.id" class="ml-4 pb-3">
            <div class="absolute w-2 h-2 bg-green-600 rounded-full -left-1 mt-1.5" />
            <div class="text-xs text-stone-500">{{ fmtDT(log.createdAt) }}</div>
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
import { computed, onMounted, ref, watch } from 'vue'
import { X, Check, CheckCheck } from 'lucide-vue-next'
import { useProductionStore } from '../../stores/production'
import { useAuthStore } from '../../stores/auth'
import type { OrderStatus, ShopOrder } from '../../types'

const props = defineProps<{ orderId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'changed'): void }>()

const store = useProductionStore()
const auth = useAuthStore()
const order = ref<ShopOrder | null>(null)
const note = ref('')
const shortages = ref<any[] | null>(null)

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PICKING', 'CANCELLED'],
  PICKING:          ['CUTTING', 'PACKING', 'CANCELLED'],
  CUTTING:          ['PACKING', 'CANCELLED'],
  PACKING:          ['READY', 'CANCELLED'],
  READY:            ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED:        [],
  CANCELLED:        [],
}
const ROLE_ALLOWED: Record<string, OrderStatus[] | 'ALL'> = {
  ADMIN: 'ALL', MANAGER: 'ALL',
  PRODUCTION: ['CONFIRMED', 'PICKING', 'CUTTING', 'PACKING', 'READY', 'CANCELLED'],
  PACKER: ['PACKING', 'READY'],
  DRIVER: ['OUT_FOR_DELIVERY', 'DELIVERED'],
}

const allowedTransitions = computed<OrderStatus[]>(() => {
  if (!order.value) return []
  const role = auth.user?.role || ''
  const allowed = ROLE_ALLOWED[role]
  const nexts = TRANSITIONS[order.value.status] || []
  if (allowed === 'ALL') return nexts
  if (!allowed) return []
  return nexts.filter((s) => allowed.includes(s))
})

async function load() {
  order.value = await store.fetchOrderDetail(props.orderId)
  shortages.value = null
}

async function advance(to: OrderStatus) {
  if (!order.value) return
  shortages.value = null
  try {
    await store.advanceStatus(order.value.id, to, note.value || undefined)
    note.value = ''
    await load()
    emit('changed')
  } catch (err: any) {
    if (err?.response?.data?.error === 'INSUFFICIENT_STOCK') {
      shortages.value = err.response.data.shortages
    } else {
      alert(err?.response?.data?.message || 'Failed to advance status')
    }
  }
}

function fmtDate(d: string) { try { return new Date(d).toLocaleDateString() } catch { return d } }
function fmtDT(d: string) { try { return new Date(d).toLocaleString() } catch { return d } }

watch(() => props.orderId, load)
onMounted(load)
</script>
