<template>
  <div>
    <button @click="$router.push('/app/pricing/edit-board')" class="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
      <ArrowLeft class="w-4 h-4" /> Back
    </button>

    <!-- Header -->
    <div v-if="boardInfo" class="bg-[rgb(134,153,64)] text-white px-6 py-3 rounded-t-xl">
      <h2 class="text-lg font-bold">{{ boardInfo.name }}</h2>
    </div>

    <div class="bg-white border border-stone-200 border-t-0 rounded-b-xl p-5 mb-4">
      <!-- Filters row -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-4">
          <span class="text-sm text-stone-600 font-medium">Filters</span>
          <span v-if="boardInfo" class="text-sm bg-stone-100 px-3 py-1 rounded">{{ boardInfo.validFrom?.slice(0,10) }} - {{ boardInfo.validTo?.slice(0,10) }}</span>
        </div>
      </div>

      <!-- Action bar -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input v-model="search" placeholder="Search Name or code..." class="pl-9 pr-3 py-2 bg-stone-100 border border-stone-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-600/50" @input="debouncedFetch" />
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button class="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg font-medium" @click="showLowMargin = !showLowMargin">Low Margin ({{ lowMarginCount }})</button>
          <button class="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="showAuditTrail = true">View Log</button>
          <button class="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="toast.info('Process Setting coming soon')">Process Setting</button>
          <button class="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="showBatchCopy = true">Batch Copy</button>
          <button class="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="toast.info('Push to Today Price coming soon')">Push to Today Price</button>
          <button class="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="exportToExcel"><Download class="w-4 h-4 inline mr-1" /> Export</button>
          <button class="px-3 py-1.5 text-sm bg-[rgb(134,153,64)] text-white rounded-lg font-medium" @click="saveChanges">Save</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white border border-stone-200 rounded-xl overflow-x-auto">
      <table class="text-xs w-full">
        <thead>
          <tr>
            <th class="sticky left-0 z-20 bg-[rgb(134,153,64)] text-white px-3 py-3 text-left font-medium border-r border-[rgb(114,133,44)]" style="min-width:260px">
              <div class="flex items-center gap-1">Product Name <ChevronDown class="w-3 h-3 opacity-60" /></div>
            </th>
            <th class="sticky z-20 bg-[rgb(134,153,64)] text-white px-2 py-3 text-center font-medium border-r border-[rgb(114,133,44)]" style="left:260px;min-width:90px">
              <div class="flex items-center justify-center gap-1">Costing <RefreshCw class="w-3 h-3 opacity-60" /></div>
            </th>
            <th class="sticky z-20 bg-[rgb(134,153,64)] text-white px-2 py-3 text-center font-medium border-r-2 border-[rgb(114,133,44)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]" style="left:350px;min-width:70px">UOM</th>
            <th v-if="boardInfo" class="bg-[rgb(134,153,64)] text-white px-3 py-2 text-center font-medium" style="min-width:180px">
              <div class="text-sm">{{ boardInfo.name }} ({{ termLabel(boardInfo.termDays) }})</div>
              <div class="text-[10px] font-normal opacity-70">MARKUP: FP = 0</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredItems" :key="row.stockItem.id" class="border-b border-stone-100" :class="showLowMargin && isLowMargin(row) ? 'bg-red-50' : ''">
            <td class="sticky left-0 z-10 px-3 py-2.5 text-stone-900 font-medium border-r-2 border-stone-300 bg-white" style="min-width:260px">
              <div class="max-w-[240px]" :title="row.stockItem.description">{{ row.stockItem.description }}</div>
            </td>
            <td class="sticky z-10 px-1 py-1.5 border-r border-stone-200 text-center bg-white" style="left:260px;min-width:90px">
              <input :value="Number(row.stockItem.costPrice).toFixed(0)" readonly class="w-14 bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" />
            </td>
            <td class="sticky z-10 px-2 py-2.5 border-r-2 border-stone-300 text-center text-stone-600 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style="left:350px;min-width:70px">{{ row.stockItem.uom }}</td>
            <td v-if="boardInfo" class="px-2 py-1.5 text-center" :class="getPrice(row) > 0 ? 'bg-[rgb(200,230,180)]' : ''">
              <div class="flex flex-col items-center gap-0.5">
                <div class="flex items-center gap-1">
                  <button class="w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center hover:bg-green-600 shrink-0">+</button>
                  <input
                    :value="getPrice(row) || ''"
                    @input="onPriceInput(row, $event)"
                    type="number" step="0.01" min="0"
                    class="w-20 bg-white border border-stone-200 rounded px-1 py-0.5 text-center text-xs"
                    :class="isDirty(row.stockItem.id) ? 'border-blue-400 bg-blue-50' : ''"
                  />
                </div>
                <span class="text-[10px] text-[rgb(134,153,64)] cursor-pointer hover:underline">Process Setting</span>
              </div>
            </td>
          </tr>
          <tr v-if="loading"><td :colspan="4" class="text-center py-8 text-stone-400">Loading...</td></tr>
          <tr v-else-if="!items.length"><td :colspan="4" class="text-center py-8 text-stone-400">No products found.</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Load More -->
    <div v-if="items.length < totalItems && !loading" class="text-center mt-4">
      <button @click="loadMore" class="px-6 py-2.5 text-sm border-2 border-[rgb(134,153,64)] text-[rgb(134,153,64)] rounded-full hover:bg-[rgb(134,153,64)]/10 transition-colors font-medium" :disabled="loadingMore">
        {{ loadingMore ? 'Loading...' : `Load More Products (${totalItems - items.length} remaining)` }}
      </button>
    </div>

    <AuditTrailModal v-model="showAuditTrail" />
    <BatchCopyModal v-model="showBatchCopy" :boards="[boardInfo].filter(Boolean)" @copied="resetAndFetch" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import * as XLSX from 'xlsx'
import { ArrowLeft, Search, Download, ChevronDown, RefreshCw } from 'lucide-vue-next'
import AuditTrailModal from '../../components/pricing/AuditTrailModal.vue'
import BatchCopyModal from '../../components/pricing/BatchCopyModal.vue'

const route = useRoute()
const toast = useToast()
const boardId = route.params.id as string

interface MatrixRow {
  stockItem: { id: string; itemCode: string; description: string; uom: string; costPrice: number; sellPrice: number }
  prices: Record<string, number>
}

const boardInfo = ref<any>(null)
const items = ref<MatrixRow[]>([])
const totalItems = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const limit = 20
const search = ref('')
const showLowMargin = ref(false)
const showAuditTrail = ref(false)
const showBatchCopy = ref(false)
const dirtyPrices = ref<Map<string, number | null>>(new Map())

function termLabel(days: number) { return days >= 365 ? '12 Months' : `${days} Days` }

function getPrice(row: MatrixRow): number {
  if (!boardInfo.value) return 0
  const key = row.stockItem.id
  if (dirtyPrices.value.has(key)) return dirtyPrices.value.get(key) ?? 0
  return row.prices[boardInfo.value.id] ?? 0
}
function isDirty(stockItemId: string) { return dirtyPrices.value.has(stockItemId) }

function onPriceInput(row: MatrixRow, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  const original = row.prices[boardInfo.value.id] ?? 0
  if (val === original || (isNaN(val) && original === 0)) {
    dirtyPrices.value.delete(row.stockItem.id)
  } else {
    dirtyPrices.value.set(row.stockItem.id, isNaN(val) ? 0 : val)
  }
}

function isLowMargin(row: MatrixRow) {
  const sell = Number(row.stockItem.sellPrice); const cost = Number(row.stockItem.costPrice)
  return sell > 0 && ((sell - cost) / sell) * 100 < 30
}
const lowMarginCount = computed(() => items.value.filter(isLowMargin).length)

const filteredItems = computed(() => {
  if (!search.value) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(r => r.stockItem.description.toLowerCase().includes(q) || r.stockItem.itemCode.toLowerCase().includes(q))
})

let searchTimeout: ReturnType<typeof setTimeout>
function debouncedFetch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(resetAndFetch, 300) }

function resetAndFetch() { page.value = 1; items.value = []; dirtyPrices.value.clear(); fetchData() }

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, limit, boardId }
    if (search.value) params.search = search.value
    const { data } = await api.get('/pricing-boards/matrix', { params })
    if (data.boards?.length) boardInfo.value = data.boards[0]
    if (page.value === 1) items.value = data.data || []
    else items.value.push(...(data.data || []))
    totalItems.value = data.total || 0
  } catch { toast.error('Failed to load') }
  finally { loading.value = false }
}

async function loadMore() { page.value++; loadingMore.value = true; await fetchData(); loadingMore.value = false }

async function saveChanges() {
  if (!dirtyPrices.value.size) { toast.info('No changes'); return }
  const changes = Array.from(dirtyPrices.value.entries()).map(([stockItemId, price]) => ({ stockItemId, boardId, price }))
  try {
    const { data } = await api.put('/pricing-boards/matrix', { changes })
    toast.success(data.message); dirtyPrices.value.clear(); resetAndFetch()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save') }
}

function exportToExcel() {
  if (!boardInfo.value) return
  const header = ['Product Code', 'Product Name', 'UOM', 'Cost', `${boardInfo.value.name} (${termLabel(boardInfo.value.termDays)})`]
  const rows = items.value.map(r => [r.stockItem.itemCode, r.stockItem.description, r.stockItem.uom, Number(r.stockItem.costPrice), getPrice(r) || ''])
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pricing')
  XLSX.writeFile(wb, `pricing-${boardInfo.value.name}.xlsx`)
}

onMounted(fetchData)
</script>
