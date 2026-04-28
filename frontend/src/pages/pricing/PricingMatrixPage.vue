<template>
  <div>
    <button @click="$router.push('/app/pricing/new')" class="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
      <ArrowLeft class="w-4 h-4" /> Back
    </button>

    <!-- Filters Panel -->
    <div v-if="showFilters" class="bg-white border border-stone-200 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-stone-900">Filters</h3>
        <button @click="showFilters = false" class="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1"><Filter class="w-4 h-4" /> Hide Filters</button>
      </div>
      <div class="space-y-3">
        <!-- Row: Date + Term -->
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-3">
            <span class="text-sm text-stone-600 font-medium w-32">Date</span>
            <span class="text-sm text-stone-900">{{ new Date().toISOString().slice(0, 10) }}</span>
          </div>
          <div class="flex items-center gap-3 ml-auto">
            <span class="text-sm text-stone-600 font-medium">Term</span>
            <select v-model="filterTerm" class="bg-stone-100 border border-stone-300 rounded-lg px-3 py-1.5 text-sm" @change="resetAndFetch">
              <option value="">All Terms</option>
              <option value="3">3 Days</option><option value="7">7 Days</option><option value="30">30 Days</option><option value="365">12 Months</option>
            </select>
          </div>
        </div>
        <!-- Row: Country + Customer Type -->
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-3">
            <span class="text-sm text-stone-600 font-medium w-32">Country</span>
            <div class="flex">
              <button v-for="(c, i) in countryOpts" :key="c.value" @click="filterCountry = c.value; resetAndFetch()" :class="['px-3 py-1.5 text-sm border transition-colors', filterCountry === c.value ? 'bg-[rgb(134,153,64)] text-white border-[rgb(134,153,64)]' : 'bg-white text-stone-600 border-stone-300', i === 0 ? 'rounded-l-lg' : i === countryOpts.length - 1 ? 'rounded-r-lg border-l-0' : 'border-l-0']">{{ c.label }}</button>
            </div>
          </div>
          <div class="flex items-center gap-3 ml-auto">
            <span class="text-sm text-stone-600 font-medium">Customer Type</span>
            <div class="flex">
              <button v-for="(t, i) in typeOpts" :key="t.value" @click="filterType = t.value" :class="['px-3 py-1.5 text-sm border transition-colors', filterType === t.value ? 'bg-[rgb(134,153,64)] text-white border-[rgb(134,153,64)]' : 'bg-white text-stone-600 border-stone-300', i === 0 ? 'rounded-l-lg' : i === typeOpts.length - 1 ? 'rounded-r-lg border-l-0' : 'border-l-0']">{{ t.label }}</button>
            </div>
          </div>
        </div>
        <!-- Row: Customer Group + Product Code -->
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-3">
            <span class="text-sm text-stone-600 font-medium w-32">Customer Group</span>
            <select v-model="filterGroup" class="bg-stone-100 border border-stone-300 rounded-lg px-3 py-1.5 text-sm min-w-[180px]" @change="resetAndFetch">
              <option value="">All Groups</option>
              <option v-for="g in customerGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="flex items-center gap-3 ml-auto">
            <span class="text-sm text-stone-600 font-medium">Product Code</span>
            <div class="flex">
              <button v-for="(p, i) in productCodeOpts" :key="p.value" @click="filterProductCode = p.value; resetAndFetch()" :class="['px-3 py-1.5 text-sm border transition-colors', filterProductCode === p.value ? 'bg-[rgb(134,153,64)] text-white border-[rgb(134,153,64)]' : 'bg-white text-stone-600 border-stone-300', i === 0 ? 'rounded-l-lg' : i === productCodeOpts.length - 1 ? 'rounded-r-lg border-l-0' : 'border-l-0']">{{ p.label }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Search + Actions Row -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input v-model="search" placeholder="Search Name or code..." class="pl-9 pr-3 py-2 bg-stone-100 border border-stone-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-600/50" @input="debouncedFetch" />
        </div>
        <span class="text-sm text-red-500 font-medium">Note : Process Direct set at Pricing Board</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="px-4 py-2 text-sm bg-red-500 text-white rounded-lg font-medium" @click="showLowMargin = !showLowMargin">Low Margin ({{ lowMarginCount }})</button>
        <button class="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="showAuditTrail = true">View Log</button>
        <button class="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="showBatchCopy = true">Batch Copy</button>
        <button class="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="exportToExcel"><Download class="w-4 h-4 inline mr-1" /> Export</button>
        <button class="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100" @click="toast.info('Sync to Order coming soon')">Sync to Order</button>
        <button class="px-4 py-2 text-sm bg-[rgb(134,153,64)] text-white rounded-lg font-medium" @click="saveChanges">Save</button>
        <button v-if="!showFilters" @click="showFilters = true" class="px-4 py-2 text-sm border border-stone-300 rounded-lg hover:bg-stone-100 flex items-center gap-1"><Filter class="w-4 h-4" /> Show Filters</button>
      </div>
    </div>

    <!-- Matrix Table -->
    <div class="bg-white border border-stone-200 rounded-xl overflow-x-auto">
      <table class="text-xs border-collapse w-full" style="min-width: max-content">
        <thead>
          <tr>
            <th class="sticky left-0 z-20 bg-[rgb(134,153,64)] text-white px-3 py-3 text-left font-medium border-r border-[rgb(114,133,44)]" style="min-width:240px">
              <div class="flex items-center gap-1">Product Name <ChevronDown class="w-3 h-3 opacity-60" /></div>
            </th>
            <th class="sticky z-20 bg-[rgb(134,153,64)] text-white px-2 py-3 text-center font-medium border-r border-[rgb(114,133,44)]" style="left:240px;min-width:90px">
              <div class="flex items-center justify-center gap-1">Costing <Eye class="w-3 h-3 opacity-60" /></div>
            </th>
            <th class="sticky z-20 bg-[rgb(134,153,64)] text-white px-2 py-3 text-center font-medium border-r-2 border-[rgb(114,133,44)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]" style="left:330px;min-width:70px">UOM</th>
            <th v-for="board in boards" :key="board.id" class="bg-[rgb(134,153,64)] text-white px-3 py-2 text-center font-medium whitespace-nowrap border-r border-[rgb(114,133,44)]" style="min-width:160px">
              <div class="text-sm">{{ board.name }} ({{ board.termDays }} Days)</div>
              <div class="text-[10px] font-normal opacity-70">MARKUP: FP = 0</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in items" :key="row.stockItem.id" class="border-b border-stone-100" :class="showLowMargin && isLowMargin(row) ? 'bg-red-50' : ''">
            <td class="sticky left-0 z-10 px-3 py-2.5 text-stone-900 font-medium border-r-2 border-stone-300 bg-white" style="min-width:240px">
              <div class="truncate max-w-[220px]" :title="row.stockItem.description">{{ row.stockItem.description }}</div>
            </td>
            <td class="sticky z-10 px-1 py-1.5 border-r border-stone-200 text-center bg-white" style="left:240px;min-width:90px">
              <input :value="Number(row.stockItem.costPrice).toFixed(0)" readonly class="w-14 bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" />
            </td>
            <td class="sticky z-10 px-2 py-2.5 border-r-2 border-stone-300 text-center text-stone-600 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]" style="left:330px;min-width:70px">{{ row.stockItem.uom }}</td>
            <td v-for="board in boards" :key="board.id" class="px-1 py-1.5 text-center border-r border-stone-100" :class="getPrice(row, board.id) > 0 ? 'bg-[rgb(200,230,180)]' : ''">
              <div class="flex items-center justify-center gap-1">
                <button class="w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center hover:bg-green-600 shrink-0">+</button>
                <input
                  :value="getPrice(row, board.id) || ''"
                  @input="onPriceInput(row, board.id, $event)"
                  type="number" step="0.01" min="0"
                  class="w-16 bg-white border border-stone-200 rounded px-1 py-0.5 text-center text-xs"
                  :class="isDirty(row.stockItem.id, board.id) ? 'border-blue-400 bg-blue-50' : ''"
                />
              </div>
            </td>
          </tr>
          <tr v-if="loading"><td :colspan="3 + boards.length" class="text-center py-8 text-stone-400">Loading...</td></tr>
          <tr v-else-if="!items.length"><td :colspan="3 + boards.length" class="text-center py-8 text-stone-400">No products found.</td></tr>
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
    <BatchCopyModal v-model="showBatchCopy" :boards="boards" @copied="resetAndFetch" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import * as XLSX from 'xlsx'
import { ArrowLeft, Search, Filter, Download, ChevronDown, Eye } from 'lucide-vue-next'
import AuditTrailModal from '../../components/pricing/AuditTrailModal.vue'
import BatchCopyModal from '../../components/pricing/BatchCopyModal.vue'

const toast = useToast()

interface MatrixRow {
  stockItem: { id: string; itemCode: string; description: string; uom: string; costPrice: number; sellPrice: number }
  prices: Record<string, number>
}

const boards = ref<{ id: string; name: string; termDays: number }[]>([])
const items = ref<MatrixRow[]>([])
const totalItems = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const limit = 20

const search = ref('')
const showFilters = ref(true)
const filterTerm = ref('')
const filterCountry = ref('')
const filterType = ref('')
const filterGroup = ref('')
const filterProductCode = ref('')
const showLowMargin = ref(false)
const showAuditTrail = ref(false)
const showBatchCopy = ref(false)
const customerGroups = ref<{ id: string; name: string }[]>([])

const dirtyPrices = ref<Map<string, number | null>>(new Map())

const countryOpts = [
  { label: 'All Countries', value: '' },
  { label: 'MY Malaysia', value: 'MY' },
  { label: 'SG Singapore', value: 'SG' },
]
const typeOpts = [
  { label: 'All', value: '' },
  { label: 'Market', value: 'Market' },
  { label: 'Non-Market', value: 'Non-Market' },
]
const productCodeOpts = [
  { label: 'All', value: '' },
  { label: 'FV', value: 'FV' },
  { label: 'DY', value: 'DY' },
  { label: 'DG', value: 'DG' },
]

function cellKey(stockItemId: string, boardId: string) { return `${stockItemId}:${boardId}` }
function getPrice(row: MatrixRow, boardId: string): number {
  const key = cellKey(row.stockItem.id, boardId)
  if (dirtyPrices.value.has(key)) return dirtyPrices.value.get(key) ?? 0
  return row.prices[boardId] ?? 0
}
function isDirty(stockItemId: string, boardId: string) { return dirtyPrices.value.has(cellKey(stockItemId, boardId)) }

function onPriceInput(row: MatrixRow, boardId: string, e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  const key = cellKey(row.stockItem.id, boardId)
  const original = row.prices[boardId] ?? 0
  if (val === original || (isNaN(val) && original === 0)) {
    dirtyPrices.value.delete(key)
  } else {
    dirtyPrices.value.set(key, isNaN(val) ? 0 : val)
  }
}

function isLowMargin(row: MatrixRow) {
  const sell = Number(row.stockItem.sellPrice)
  const cost = Number(row.stockItem.costPrice)
  if (sell <= 0) return false
  return ((sell - cost) / sell) * 100 < 30
}

const lowMarginCount = computed(() => items.value.filter(isLowMargin).length)

let searchTimeout: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => resetAndFetch(), 300)
}

function resetAndFetch() {
  page.value = 1
  items.value = []
  dirtyPrices.value.clear()
  fetchMatrix()
}

async function fetchMatrix() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value, limit }
    if (search.value) params.search = search.value
    if (filterTerm.value) params.termDays = filterTerm.value
    if (filterCountry.value) params.country = filterCountry.value
    if (filterGroup.value) params.customerGroupId = filterGroup.value
    if (filterProductCode.value) params.productCode = filterProductCode.value

    const { data } = await api.get('/pricing-boards/matrix', { params })
    boards.value = data.boards || []
    if (page.value === 1) {
      items.value = data.data || []
    } else {
      items.value.push(...(data.data || []))
    }
    totalItems.value = data.total || 0
  } catch { toast.error('Failed to load pricing matrix') }
  finally { loading.value = false }
}

async function loadMore() {
  page.value++
  loadingMore.value = true
  await fetchMatrix()
  loadingMore.value = false
}

async function saveChanges() {
  if (!dirtyPrices.value.size) { toast.info('No changes to save'); return }
  const changes = Array.from(dirtyPrices.value.entries()).map(([key, price]) => {
    const [stockItemId, boardId] = key.split(':')
    return { stockItemId, boardId, price }
  })
  try {
    const { data } = await api.put('/pricing-boards/matrix', { changes })
    toast.success(data.message)
    dirtyPrices.value.clear()
    page.value = 1
    items.value = []
    fetchMatrix()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save') }
}

function exportToExcel() {
  const header = ['Product Code', 'Product Name', 'UOM', 'Cost', 'Sell Price', ...boards.value.map(b => `${b.name} (${b.termDays}D)`)]
  const rows = items.value.map(row => [
    row.stockItem.itemCode, row.stockItem.description, row.stockItem.uom,
    Number(row.stockItem.costPrice), Number(row.stockItem.sellPrice),
    ...boards.value.map(b => getPrice(row, b.id) || ''),
  ])
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pricing Matrix')
  XLSX.writeFile(wb, `pricing-matrix-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

onMounted(async () => {
  try {
    const { data } = await api.get('/customer-groups', { params: { limit: 100 } })
    customerGroups.value = data.data || []
  } catch {}
  fetchMatrix()
})
</script>
