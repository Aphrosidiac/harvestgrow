<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Price History</h2>
      <BaseButton variant="secondary" size="md" @click="exportCsv" :disabled="!rows.length">
        <Download class="w-4 h-4 mr-1.5" /> Export CSV
      </BaseButton>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs text-stone-500 mb-1">Stock Item (optional)</label>
        <select v-model="stockItemId" class="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All items</option>
          <option v-for="it in items" :key="it.id" :value="it.id">{{ it.itemCode }} — {{ it.description }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">From</label>
        <input v-model="from" type="date" class="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">To</label>
        <input v-model="to" type="date" class="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <BaseButton variant="primary" size="md" @click="fetchData" :loading="loading">Apply</BaseButton>
    </div>

    <BaseTable :columns="columns" :data="rows" :loading="loading" empty-text="No price changes in this range.">
      <template #cell-changedAt="{ value }">{{ fmtDate(value) }}</template>
      <template #cell-oldPrice="{ value }">RM {{ Number(value).toFixed(2) }}</template>
      <template #cell-newPrice="{ value }">RM {{ Number(value).toFixed(2) }}</template>
      <template #cell-deltaPct="{ value }">
        <span :class="value > 0 ? 'text-red-500' : value < 0 ? 'text-green-600' : 'text-stone-500'">
          {{ value > 0 ? '+' : '' }}{{ value }}%
        </span>
      </template>
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseTable from '../../components/base/BaseTable.vue'
import { Download } from 'lucide-vue-next'
import * as XLSX from 'xlsx'

const today = () => new Date().toISOString().split('T')[0]
const stockItemId = ref('')
const from = ref(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
const to = ref(today())
const items = ref<any[]>([])
const rows = ref<any[]>([])
const loading = ref(false)

const columns = [
  { key: 'changedAt', label: 'Date' },
  { key: 'itemCode', label: 'Item' },
  { key: 'description', label: 'Description' },
  { key: 'oldPrice', label: 'Old Price' },
  { key: 'newPrice', label: 'New Price' },
  { key: 'deltaPct', label: 'Change' },
  { key: 'changedBy', label: 'By' },
]

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-MY') }

async function fetchItems() {
  const { data } = await api.get('/stock', { params: { limit: 500 } })
  items.value = data.data || []
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/price-history', { params: { stockItemId: stockItemId.value || undefined, from: from.value, to: to.value } })
    rows.value = data.data
  } finally { loading.value = false }
}

function exportCsv() {
  const ws = XLSX.utils.json_to_sheet(rows.value.map(r => ({
    Date: fmtDate(r.changedAt), Item: r.itemCode, Description: r.description,
    'Old Price': r.oldPrice, 'New Price': r.newPrice, Change: r.deltaPct + '%', By: r.changedBy || '',
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Price History')
  XLSX.writeFile(wb, `price-history-${from.value}-to-${to.value}.csv`, { bookType: 'csv' })
}

onMounted(async () => { await fetchItems(); await fetchData() })
</script>
