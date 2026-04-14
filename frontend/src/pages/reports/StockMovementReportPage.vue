<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Stock Movement</h2>
      <BaseButton variant="secondary" size="md" @click="exportCsv" :disabled="!rows.length">
        <Download class="w-4 h-4 mr-1.5" /> Export CSV
      </BaseButton>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs text-stone-500 mb-1">Stock Item</label>
        <select v-model="stockItemId" class="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm">
          <option value="">Select item…</option>
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
      <BaseButton variant="primary" size="md" @click="fetchData" :loading="loading" :disabled="!stockItemId">Apply</BaseButton>
    </div>

    <div v-if="totals" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">In</p>
        <p class="text-xl font-bold text-green-600">{{ totals.in }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">Out</p>
        <p class="text-xl font-bold text-red-500">{{ totals.out }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">Net</p>
        <p class="text-xl font-bold">{{ totals.net }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">Current Stock</p>
        <p class="text-xl font-bold">{{ totals.currentStock }}</p>
      </div>
    </div>

    <BaseTable :columns="columns" :data="rows" :loading="loading" empty-text="Select an item to view movements.">
      <template #cell-date="{ value }">{{ fmtDate(value) }}</template>
      <template #cell-type="{ value }">
        <BaseBadge :color="value === 'IN' ? 'green' : 'red'">{{ value }}</BaseBadge>
      </template>
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseTable from '../../components/base/BaseTable.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import { Download } from 'lucide-vue-next'
import * as XLSX from 'xlsx'

const today = () => new Date().toISOString().split('T')[0]
const stockItemId = ref('')
const from = ref(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
const to = ref(today())
const items = ref<any[]>([])
const rows = ref<any[]>([])
const totals = ref<{ in: number; out: number; net: number; currentStock: number } | null>(null)
const loading = ref(false)

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'qty', label: 'Qty' },
  { key: 'reference', label: 'Reference' },
  { key: 'partyName', label: 'Party' },
  { key: 'balance', label: 'Balance' },
]

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-MY') }

async function fetchItems() {
  const { data } = await api.get('/stock', { params: { limit: 500 } })
  items.value = data.data || []
}

async function fetchData() {
  if (!stockItemId.value) return
  loading.value = true
  try {
    const { data } = await api.get('/reports/stock-movement', { params: { stockItemId: stockItemId.value, from: from.value, to: to.value } })
    rows.value = data.data
    totals.value = data.totals
  } finally { loading.value = false }
}

function exportCsv() {
  const ws = XLSX.utils.json_to_sheet(rows.value.map(r => ({
    Date: fmtDate(r.date), Type: r.type, Qty: r.qty, Reference: r.reference, Party: r.partyName, Balance: r.balance,
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Stock Movement')
  XLSX.writeFile(wb, `stock-movement-${from.value}-to-${to.value}.csv`, { bookType: 'csv' })
}

onMounted(fetchItems)
</script>
