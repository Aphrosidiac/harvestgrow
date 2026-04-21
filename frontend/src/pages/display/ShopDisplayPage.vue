<template>
  <div class="h-screen w-screen overflow-hidden flex flex-col font-sans select-none bg-[#f5ebe2]">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 lg:px-10 py-4 bg-white border-b border-stone-200 shadow-sm flex-wrap gap-3">
      <div class="flex items-center gap-4">
        <img src="/logo-nav.png" alt="HarvestGrow" class="h-10" />
        <div class="h-6 w-px bg-stone-300"></div>
        <h1 class="text-xs font-semibold tracking-[0.3em] uppercase text-[#495c14]">Production Live</h1>
      </div>
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-5 text-sm">
          <span class="text-stone-500">{{ totalCards }} Orders</span>
          <span class="text-amber-600 font-medium">{{ waitingCards.length }} Waiting</span>
          <span class="text-blue-600 font-medium">{{ progressCards.length }} In Progress</span>
          <span class="text-green-700 font-medium">{{ readyCards.length }} Ready</span>
        </div>
        <div class="h-6 w-px bg-stone-300"></div>
        <div class="text-right">
          <p class="text-base font-semibold tabular-nums text-stone-900">{{ currentTime }}</p>
          <p class="text-xs text-stone-500">{{ currentDate }}</p>
        </div>
      </div>
    </header>

    <!-- Columns -->
    <main class="flex-1 flex flex-col lg:flex-row overflow-hidden">
      <!-- Waiting -->
      <section class="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200 min-w-0">
        <div class="px-4 py-3 border-b border-amber-200/60 bg-amber-50 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span class="text-amber-700 text-sm font-semibold uppercase tracking-wider">Waiting</span>
          <span class="text-amber-700/60 text-sm ml-auto">{{ waitingCards.length }}</span>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <Card v-for="c in waitingCards" :key="c.id" :card="c" accent="amber" />
          <Empty v-if="!waitingCards.length" text="No waiting orders" />
        </div>
      </section>

      <!-- In Progress -->
      <section class="flex-[2] flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200 min-w-0">
        <div class="px-4 py-3 border-b border-blue-200/60 bg-blue-50 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span class="text-blue-700 text-sm font-semibold uppercase tracking-wider">In Progress</span>
          <span class="text-blue-700/60 text-sm ml-auto">{{ progressCards.length }}</span>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
            <Card v-for="c in progressCards" :key="c.id" :card="c" accent="blue" show-status />
          </div>
          <Empty v-if="!progressCards.length" text="No orders in progress" />
        </div>
      </section>

      <!-- Ready -->
      <section class="flex-1 flex flex-col min-w-0">
        <div class="px-4 py-3 border-b border-green-200/60 bg-green-50 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-green-600"></span>
          <span class="text-green-700 text-sm font-semibold uppercase tracking-wider">Ready for Delivery</span>
          <span class="text-green-700/60 text-sm ml-auto">{{ readyCards.length }}</span>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <Card v-for="c in readyCards" :key="c.id" :card="c" accent="green" />
          <Empty v-if="!readyCards.length" text="No orders ready" />
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="px-8 py-2.5 border-t border-stone-200 bg-white flex items-center justify-between">
      <p class="text-xs text-stone-500">Harvest Grow Veg Sdn Bhd — Fresh Produce Supplier</p>
      <div class="flex items-center gap-2">
        <span class="h-2 w-2 rounded-full bg-green-600 animate-pulse"></span>
        <p class="text-xs text-stone-500">Live · updated {{ lastUpdateLabel }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h, type PropType } from 'vue'
import { useProductionStore } from '../../stores/production'
import type { BoardCard } from '../../types'

const store = useProductionStore()
const currentTime = ref('')
const currentDate = ref('')
const lastFetched = ref<Date | null>(null)
const lastUpdateLabel = ref('—')
let clockTimer: ReturnType<typeof setInterval>
let pollTimer: ReturnType<typeof setInterval>
let labelTimer: ReturnType<typeof setInterval>

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  currentDate.value = now.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function updateLastLabel() {
  if (!lastFetched.value) { lastUpdateLabel.value = '—'; return }
  const s = Math.floor((Date.now() - lastFetched.value.getTime()) / 1000)
  lastUpdateLabel.value = s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
}

async function refresh() {
  const today = new Date().toISOString().slice(0, 10)
  await store.fetchBoard(today, false)
  lastFetched.value = new Date()
  updateLastLabel()
}

const allCards = computed<BoardCard[]>(() => Object.values(store.board).flat())
const waitingCards = computed(() => allCards.value.filter(c => c.status === 'PENDING' || c.status === 'CONFIRMED'))
const progressCards = computed(() => allCards.value.filter(c => ['PICKING', 'CUTTING', 'PACKING'].includes(c.status)))
const readyCards = computed(() => allCards.value.filter(c => c.status === 'READY'))
const totalCards = computed(() => waitingCards.value.length + progressCards.value.length + readyCards.value.length)

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  refresh()
  pollTimer = setInterval(refresh, 15000)
  labelTimer = setInterval(updateLastLabel, 5000)
})
onUnmounted(() => { clearInterval(clockTimer); clearInterval(pollTimer); clearInterval(labelTimer) })

// Inline Card & Empty components
const Card = (props: { card: BoardCard; accent: 'amber' | 'blue' | 'green'; showStatus?: boolean }) => {
  const borderMap = { amber: 'border-amber-200', blue: 'border-blue-200', green: 'border-green-200' } as const
  const dotMap = { amber: 'bg-amber-500/15 text-amber-700', blue: 'bg-blue-500/15 text-blue-700', green: 'bg-green-600/15 text-green-700' } as const
  const c = props.card
  const mins = c.oldestPendingMinutes || 0
  const age = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  return h('div', { class: `rounded-xl bg-white border ${borderMap[props.accent]} p-4 shadow-sm` }, [
    h('div', { class: 'flex items-center justify-between mb-1.5' }, [
      h('span', { class: 'font-bold text-base font-mono text-stone-900' }, c.orderNumber),
      h('span', { class: `text-xs px-1.5 py-0.5 rounded ${c.deliverySlot === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}` }, c.deliverySlot),
    ]),
    h('p', { class: 'text-sm text-stone-700 font-medium mb-1' }, c.contactName),
    h('div', { class: 'flex items-center gap-3 text-xs text-stone-500 mb-2' }, [
      h('span', {}, `${c.lineCount} items`),
      h('span', {}, `RM ${Number(c.total).toFixed(2)}`),
      c.perishableCount > 0 ? h('span', { class: 'text-red-500' }, `• ${c.perishableCount} perishable`) : null,
    ]),
    h('div', { class: 'flex items-center justify-between pt-2 border-t border-stone-100' }, [
      props.showStatus ? h('span', { class: `text-[10px] px-1.5 py-0.5 rounded font-semibold ${dotMap[props.accent]}` }, c.status) : h('span'),
      h('span', { class: 'text-xs text-stone-400 tabular-nums' }, age),
    ]),
  ])
}
Card.props = { card: { type: Object as PropType<BoardCard>, required: true }, accent: String, showStatus: Boolean }

const Empty = (props: { text: string }) => h('p', { class: 'text-sm text-center py-8 text-stone-300' }, props.text)
Empty.props = { text: String }
</script>
