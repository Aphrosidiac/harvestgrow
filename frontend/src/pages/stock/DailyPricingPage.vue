<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h2 class="text-xl font-semibold text-stone-900 flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-green-600" /> Daily Pricing
          </h2>
          <p class="text-sm text-stone-600 mt-0.5">Updating prices for: <span class="font-medium text-stone-900">{{ todayLabel }}</span></p>
        </div>
        <div class="flex items-center gap-2">
          <select
            v-model="categoryFilter"
            class="bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50"
          >
            <option value="">All Categories</option>
            <option v-for="c in stock.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <BaseButton variant="secondary" size="md" @click="$router.push('/app/stock')">
            <ArrowLeft class="w-4 h-4 mr-1.5" /> Back to Stock
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Note field -->
    <div class="mb-4 bg-white border border-stone-200 rounded-lg p-3 flex items-center gap-3">
      <label class="text-xs font-medium text-stone-700 uppercase whitespace-nowrap">Bulk note (optional):</label>
      <input
        v-model="note"
        type="text"
        placeholder="e.g. Weekly market rate adjustment"
        class="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50"
      />
      <span class="text-xs text-stone-500">{{ changedCount }} changed / {{ filteredItems.length }} total</span>
    </div>

    <!-- Table -->
    <div class="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-stone-50 border-b border-stone-200">
          <tr class="text-left">
            <th class="px-3 py-2 w-14"></th>
            <th class="px-3 py-2 font-medium text-stone-700">Item Code</th>
            <th class="px-3 py-2 font-medium text-stone-700">Description</th>
            <th class="px-3 py-2 font-medium text-stone-700">UOM</th>
            <th class="px-3 py-2 font-medium text-stone-700 text-right">Previous</th>
            <th class="px-3 py-2 font-medium text-stone-700 text-right w-40">Today's Price</th>
            <th class="px-3 py-2 font-medium text-stone-700 text-right w-20">Δ %</th>
            <th class="px-3 py-2 font-medium text-stone-700 w-32">Last Changed</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="stock.loading">
            <td colspan="8" class="px-3 py-8 text-center text-stone-500">Loading...</td>
          </tr>
          <tr v-else-if="!filteredItems.length">
            <td colspan="8" class="px-3 py-8 text-center text-stone-500">No items found.</td>
          </tr>
          <tr
            v-for="(row, idx) in filteredItems"
            :key="row.id"
            class="border-t border-stone-100 hover:bg-stone-50/50"
          >
            <td class="px-3 py-2">
              <img v-if="row.imageUrl" :src="row.imageUrl" alt="" class="w-10 h-10 object-cover rounded border border-stone-200" />
              <div v-else class="w-10 h-10 bg-stone-100 rounded border border-stone-200 flex items-center justify-center text-stone-400 text-xs">—</div>
            </td>
            <td class="px-3 py-2 font-mono text-green-700">{{ row.itemCode }}</td>
            <td class="px-3 py-2 text-stone-900">
              {{ row.description }}
              <span v-if="isStale(row)" class="ml-1 text-amber-500" title="Price not updated in >7 days">⚠️</span>
            </td>
            <td class="px-3 py-2 text-stone-600">{{ row.uom }}</td>
            <td class="px-3 py-2 text-right text-stone-400">RM {{ Number(row.sellPrice).toFixed(2) }}</td>
            <td class="px-3 py-2">
              <input
                :ref="el => setInputRef(el, idx)"
                v-model="newPrices[row.id]"
                @keydown.enter.prevent="focusNext(idx)"
                type="number"
                step="0.01"
                min="0"
                class="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-stone-900 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600"
              />
            </td>
            <td class="px-3 py-2 text-right text-xs font-medium" :class="deltaClass(row)">
              <span v-if="deltaPct(row) !== null">
                {{ deltaPct(row)! > 0 ? '▲' : '▼' }} {{ Math.abs(deltaPct(row)!).toFixed(1) }}%
              </span>
              <span v-else class="text-stone-400">—</span>
            </td>
            <td class="px-3 py-2 text-stone-500 text-xs">{{ relativeTime(row.priceUpdatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Apply All -->
    <div class="mt-4 flex items-center justify-end gap-3">
      <p v-if="changedCount > 0" class="text-sm text-stone-600">
        <strong class="text-stone-900">{{ changedCount }}</strong> price change(s) ready to apply.
      </p>
      <BaseButton variant="primary" size="md" :disabled="changedCount === 0 || saving" @click="applyAll">
        <Check class="w-4 h-4 mr-1.5" /> {{ saving ? 'Applying...' : 'Apply All' }}
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStockStore } from '../../stores/stock'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import { TrendingUp, Check, ArrowLeft } from 'lucide-vue-next'
import type { StockItem } from '../../types'

const stock = useStockStore()
const toast = useToast()

const categoryFilter = ref('')
const note = ref('')
const newPrices = ref<Record<string, string>>({})
const saving = ref(false)
const inputRefs: HTMLInputElement[] = []

const todayLabel = computed(() =>
  new Date().toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
)

const filteredItems = computed(() => {
  const list = stock.items
  return categoryFilter.value ? list.filter((i) => i.categoryId === categoryFilter.value) : list
})

const changedCount = computed(() =>
  filteredItems.value.filter((row) => {
    const v = parseFloat(newPrices.value[row.id] || '')
    return !isNaN(v) && v !== Number(row.sellPrice)
  }).length
)

function setInputRef(el: any, idx: number) {
  if (el) inputRefs[idx] = el as HTMLInputElement
}

function focusNext(idx: number) {
  const next = inputRefs[idx + 1]
  if (next) next.focus()
}

function deltaPct(row: StockItem): number | null {
  const v = parseFloat(newPrices.value[row.id] || '')
  const curr = Number(row.sellPrice)
  if (isNaN(v) || curr === 0 || v === curr) return null
  return ((v - curr) / curr) * 100
}

function deltaClass(row: StockItem) {
  const d = deltaPct(row)
  if (d === null) return ''
  return d > 0 ? 'text-green-600' : 'text-red-500'
}

function isStale(row: StockItem): boolean {
  if (!row.priceUpdatedAt) return false
  const days = (Date.now() - new Date(row.priceUpdatedAt).getTime()) / 86400000
  return days > 7
}

function relativeTime(dateStr?: string) {
  if (!dateStr) return '—'
  const secs = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function initPrices() {
  for (const row of stock.items) {
    newPrices.value[row.id] = Number(row.sellPrice).toFixed(2)
  }
}

async function applyAll() {
  const updates = filteredItems.value
    .map((row) => {
      const v = parseFloat(newPrices.value[row.id] || '')
      if (isNaN(v) || v === Number(row.sellPrice)) return null
      return { id: row.id, sellPrice: v }
    })
    .filter((u): u is { id: string; sellPrice: number } => u !== null)

  if (!updates.length) return

  saving.value = true
  try {
    const res = await stock.bulkPriceUpdate(updates, note.value || undefined)
    toast.success(`${res.updated} prices updated. ${res.skipped} unchanged.`)
    note.value = ''
    await stock.fetchItems({ limit: 500 })
    initPrices()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to update prices')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  stock.limit = 500
  await Promise.all([stock.fetchItems({ limit: 500 }), stock.fetchCategories()])
  initPrices()
  await nextTick()
})
</script>
