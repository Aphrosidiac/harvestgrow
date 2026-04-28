<template>
  <div v-if="list">
    <button @click="$router.push('/app/product-clearance')" class="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-3">
      <ArrowLeft class="w-4 h-4" /> Back
    </button>

    <!-- Header -->
    <div class="bg-[rgb(134,153,64)] text-white px-6 py-3 rounded-t-xl flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input v-model="searchQuery" placeholder="Search Produce..." class="pl-9 pr-3 py-1.5 bg-white/20 rounded text-sm placeholder:text-white/60 focus:outline-none focus:bg-white/30 w-48" />
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span>Margin:</span>
          <input v-model.number="marginThreshold" type="number" min="0" max="100" class="w-12 px-1 py-0.5 bg-white/20 rounded text-center text-sm" />
          <span>%</span>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="toast.info('Audit Trail coming soon')">Audit Trail</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="showSettings = true">Clearance Settings</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="exportToExcel">
          <Download class="w-4 h-4 inline mr-1" /> Export
        </button>
        <button class="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors" @click="showLowMargin = !showLowMargin">
          Low Margin ({{ lowMarginCount }})
        </button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="toast.info('Yesterday High Loss coming soon')">Yesterday High Loss</button>
        <button class="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors" @click="toast.info('Sorting Manage coming soon')">Sorting Manage</button>
        <button v-if="list.status === 'OPEN'" class="px-3 py-1.5 bg-stone-700 hover:bg-stone-800 rounded text-sm font-medium transition-colors" @click="closeList">
          <Lock class="w-4 h-4 inline mr-1" /> Close
        </button>
      </div>
    </div>

    <!-- Sub header -->
    <div class="bg-white border-x border-stone-200 px-6 py-3 flex items-center justify-between">
      <div class="text-sm font-medium text-stone-700">Stock Date: {{ formatDate(list.date) }}</div>
      <div class="flex items-center gap-2">
        <button v-for="tab in ['WORKER', 'PURCHASE', 'ALL']" :key="tab" @click="filterTab = tab" :class="['px-3 py-1 text-sm rounded transition-colors', filterTab === tab ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200']">{{ tab }}</button>
      </div>
    </div>

    <!-- Spreadsheet -->
    <div class="bg-white border border-stone-200 border-t-0 rounded-b-xl overflow-x-auto">
      <table class="w-full text-xs" style="table-layout: fixed; min-width: 1000px">
        <thead>
          <tr>
            <th class="w-10 px-1 py-2 bg-stone-200 border-b border-stone-300 text-center font-medium">Seq</th>
            <th class="w-48 px-2 py-2 bg-stone-200 border-b border-stone-300 text-left font-medium">Product Name</th>
            <th :colspan="filterTab === 'WORKER' ? 1 : 2" class="px-1 py-2 bg-green-600 text-white text-center font-medium border-b border-green-700">IN</th>
            <th class="w-20 px-1 py-2 bg-yellow-200 border-b border-yellow-300 text-center font-medium">Cost</th>
            <th class="w-24 px-1 py-2 bg-yellow-100 border-b border-yellow-200 text-center font-medium">Yesterday Balance</th>
            <th v-if="filterTab !== 'PURCHASE'" colspan="2" class="px-1 py-2 bg-red-500 text-white text-center font-medium border-b border-red-600">OUT</th>
            <th v-if="filterTab !== 'WORKER'" class="w-20 px-1 py-2 bg-stone-200 border-b border-stone-300 text-center font-medium">RETURN IN</th>
            <th class="w-24 px-1 py-2 bg-stone-200 border-b border-stone-300 text-center font-medium">Estimated Balance</th>
            <th v-if="filterTab !== 'WORKER'" class="w-24 px-1 py-2 bg-stone-200 border-b border-stone-300 text-center font-medium">Act Balance</th>
            <th v-if="filterTab !== 'WORKER'" class="w-16 px-1 py-2 bg-stone-200 border-b border-stone-300 text-center font-medium">Lost</th>
            <th v-if="filterTab !== 'WORKER'" class="w-16 px-1 py-2 bg-stone-200 border-b border-stone-300 text-center font-medium">Wastage</th>
            <th v-if="filterTab === 'ALL'" colspan="2" class="px-1 py-2 bg-stone-200 border-b border-stone-300 text-center font-medium">Supply Return</th>
          </tr>
          <tr class="text-[10px] text-stone-500">
            <th class="bg-stone-100 border-b border-stone-200"></th>
            <th class="bg-stone-100 border-b border-stone-200"></th>
            <th v-if="filterTab !== 'WORKER'" class="w-28 bg-green-50 border-b border-green-100 text-center px-1 py-1">Supplier</th>
            <th class="w-16 bg-green-50 border-b border-green-100 text-center px-1 py-1">Qty</th>
            <th class="bg-yellow-50 border-b border-yellow-100"></th>
            <th class="bg-yellow-50 border-b border-yellow-100"></th>
            <th v-if="filterTab !== 'PURCHASE'" class="w-16 bg-red-50 border-b border-red-100 text-center px-1 py-1">Packing</th>
            <th v-if="filterTab !== 'PURCHASE'" class="w-16 bg-red-50 border-b border-red-100 text-center px-1 py-1">Loose</th>
            <th v-if="filterTab !== 'WORKER'" class="bg-stone-100 border-b border-stone-200"></th>
            <th class="bg-stone-100 border-b border-stone-200"></th>
            <th v-if="filterTab !== 'WORKER'" class="bg-stone-100 border-b border-stone-200"></th>
            <th v-if="filterTab !== 'WORKER'" class="bg-stone-100 border-b border-stone-200"></th>
            <th v-if="filterTab !== 'WORKER'" class="bg-stone-100 border-b border-stone-200"></th>
            <th v-if="filterTab === 'ALL'" class="w-28 bg-stone-100 border-b border-stone-200 text-center px-1 py-1">Supplier</th>
            <th v-if="filterTab === 'ALL'" class="w-16 bg-stone-100 border-b border-stone-200 text-center px-1 py-1">Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in filteredItems" :key="item.stockItemId" class="border-b border-stone-100 hover:bg-stone-50" :class="isLowMargin(item) && showLowMargin ? 'bg-red-50' : ''">
            <td class="px-1 py-1.5 text-center text-stone-500">{{ idx + 1 }}</td>
            <td class="px-2 py-1.5 text-stone-900 font-medium truncate" :title="item.stockItem?.description">{{ item.stockItem?.description }}</td>
            <td v-if="filterTab !== 'WORKER'" class="px-1 py-1.5">
              <select v-model="item.inSupplierId" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-xs" :disabled="isClosed">
                <option :value="null">-</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.shortForm || s.companyName }}</option>
              </select>
            </td>
            <td class="px-1 py-1.5"><input v-model.number="item.inQty" type="number" step="0.001" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" @input="recalculate(item)" /></td>
            <td class="px-1 py-1.5 bg-yellow-50"><input v-model.number="item.cost" type="number" step="0.01" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" /></td>
            <td class="px-1 py-1.5 bg-yellow-50/50 text-center text-stone-600">{{ Number(item.yesterdayBalance).toFixed(0) }}</td>
            <td v-if="filterTab !== 'PURCHASE'" class="px-1 py-1.5"><input v-model.number="item.outPacking" type="number" step="0.001" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" @input="recalculate(item)" /></td>
            <td v-if="filterTab !== 'PURCHASE'" class="px-1 py-1.5"><input v-model.number="item.outLoose" type="number" step="0.001" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" @input="recalculate(item)" /></td>
            <td v-if="filterTab !== 'WORKER'" class="px-1 py-1.5"><input v-model.number="item.returnIn" type="number" step="0.001" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" @input="recalculate(item)" /></td>
            <td class="px-1 py-1.5 text-center text-stone-700 font-medium">{{ Number(item.estimatedBalance).toFixed(0) }}</td>
            <td v-if="filterTab !== 'WORKER'" class="px-1 py-1.5"><input v-model.number="item.actualBalance" type="number" step="0.001" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" @input="recalculate(item)" /></td>
            <td v-if="filterTab !== 'WORKER'" class="px-1 py-1.5 text-center" :class="Number(item.lost) > 0 ? 'text-red-600 font-medium' : 'text-stone-500'">{{ Number(item.lost).toFixed(0) }}</td>
            <td v-if="filterTab !== 'WORKER'" class="px-1 py-1.5"><input v-model.number="item.wastage" type="number" step="0.001" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" /></td>
            <td v-if="filterTab === 'ALL'" class="px-1 py-1.5">
              <select v-model="item.supplyReturnSupplierId" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-xs" :disabled="isClosed">
                <option :value="null">-</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.shortForm || s.companyName }}</option>
              </select>
            </td>
            <td v-if="filterTab === 'ALL'" class="px-1 py-1.5"><input v-model.number="item.supplyReturnQty" type="number" step="0.001" min="0" class="w-full bg-transparent border border-stone-200 rounded px-1 py-0.5 text-center text-xs" :disabled="isClosed" /></td>
          </tr>
          <tr v-if="!filteredItems.length">
            <td :colspan="filterTab === 'ALL' ? 15 : filterTab === 'WORKER' ? 7 : 11" class="text-center py-8 text-stone-400">No items.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Save button -->
    <div v-if="list.status === 'OPEN'" class="flex justify-end mt-4">
      <BaseButton variant="primary" :loading="saving" @click="saveItems">Save Changes</BaseButton>
    </div>

    <ClearanceSettingsModal v-model="showSettings" @saved="loadList" />
  </div>
  <div v-else class="text-center py-12 text-stone-400">Loading...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import ClearanceSettingsModal from '../../components/product-clearance/ClearanceSettingsModal.vue'
import { ArrowLeft, Search, Download, Lock } from 'lucide-vue-next'
import * as XLSX from 'xlsx'
import type { ClearanceList, ClearanceItem } from '../../types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const list = ref<ClearanceList | null>(null)
const items = ref<ClearanceItem[]>([])
const suppliers = ref<{ id: string; companyName: string; shortForm?: string }[]>([])
const searchQuery = ref('')
const marginThreshold = ref(30)
const showLowMargin = ref(false)
const filterTab = ref('ALL')
const saving = ref(false)
const showSettings = ref(false)

const isClosed = computed(() => list.value?.status === 'CLOSED')

const filteredItems = computed(() => {
  let result = items.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(i => i.stockItem?.description.toLowerCase().includes(q) || i.stockItem?.itemCode.toLowerCase().includes(q))
  }
  return result
})

const lowMarginCount = computed(() => {
  return items.value.filter(i => isLowMargin(i)).length
})

function isLowMargin(item: ClearanceItem): boolean {
  const sell = Number(item.stockItem?.sellPrice || 0)
  const cost = Number(item.cost || 0)
  if (sell <= 0) return false
  return ((sell - cost) / sell) * 100 < marginThreshold.value
}

function recalculate(item: ClearanceItem) {
  const yb = Number(item.yesterdayBalance) || 0
  const inQ = Number(item.inQty) || 0
  const outP = Number(item.outPacking) || 0
  const outL = Number(item.outLoose) || 0
  const retIn = Number(item.returnIn) || 0
  const actBal = Number(item.actualBalance) || 0
  item.estimatedBalance = yb + inQ - outP - outL + retIn
  item.lost = item.estimatedBalance - actBal
}

function formatDate(d: string): string {
  const date = new Date(d)
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

async function loadList() {
  try {
    const { data } = await api.get(`/product-clearance/${route.params.id}`)
    list.value = data.data
    items.value = (data.data.items || []).map((i: any) => ({
      ...i,
      inQty: Number(i.inQty),
      cost: Number(i.cost),
      yesterdayBalance: Number(i.yesterdayBalance),
      outPacking: Number(i.outPacking),
      outLoose: Number(i.outLoose),
      returnIn: Number(i.returnIn),
      estimatedBalance: Number(i.estimatedBalance),
      actualBalance: Number(i.actualBalance),
      lost: Number(i.lost),
      wastage: Number(i.wastage),
      supplyReturnQty: Number(i.supplyReturnQty),
      inSupplierId: i.inSupplierId || null,
      supplyReturnSupplierId: i.supplyReturnSupplierId || null,
    }))
  } catch {
    toast.error('Failed to load clearance list')
    router.push('/app/product-clearance')
  }
}

async function loadSuppliers() {
  try {
    const { data } = await api.get('/suppliers', { params: { limit: 500 } })
    suppliers.value = data.data || []
  } catch { /* ignore */ }
}

async function saveItems() {
  saving.value = true
  try {
    items.value.forEach(recalculate)
    await api.put(`/product-clearance/${route.params.id}/items`, {
      items: items.value.map((item, idx) => ({
        stockItemId: item.stockItemId,
        sortOrder: idx,
        inSupplierId: item.inSupplierId,
        inQty: item.inQty,
        cost: item.cost,
        yesterdayBalance: item.yesterdayBalance,
        outPacking: item.outPacking,
        outLoose: item.outLoose,
        returnIn: item.returnIn,
        actualBalance: item.actualBalance,
        wastage: item.wastage,
        supplyReturnSupplierId: item.supplyReturnSupplierId,
        supplyReturnQty: item.supplyReturnQty,
      })),
    })
    toast.success('Changes saved')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally { saving.value = false }
}

async function closeList() {
  await saveItems()
  try {
    await api.patch(`/product-clearance/${route.params.id}/status`, { status: 'CLOSED' })
    toast.success('Clearance list closed')
    router.push('/app/product-clearance')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to close')
  }
}

function exportToExcel() {
  const data = items.value.map((item, idx) => ({
    'Seq': idx + 1,
    'Product Code': item.stockItem?.itemCode || '',
    'Product Name': item.stockItem?.description || '',
    'IN Supplier': item.inSupplier?.companyName || '',
    'IN Qty': item.inQty,
    'Cost': item.cost,
    'Yesterday Balance': item.yesterdayBalance,
    'OUT Packing': item.outPacking,
    'OUT Loose': item.outLoose,
    'Return In': item.returnIn,
    'Estimated Balance': item.estimatedBalance,
    'Act Balance': item.actualBalance,
    'Lost': item.lost,
    'Wastage': item.wastage,
    'Supply Return Supplier': item.supplyReturnSupplier?.companyName || '',
    'Supply Return Qty': item.supplyReturnQty,
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Clearance')
  XLSX.writeFile(wb, `clearance-${formatDate(list.value?.date || '')}.xlsx`)
}

onMounted(() => {
  loadList()
  loadSuppliers()
})
</script>
