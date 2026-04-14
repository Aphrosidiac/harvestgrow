<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Orders Report</h2>
      <BaseButton variant="secondary" size="md" @click="exportCsv" :disabled="!rows.length">
        <Download class="w-4 h-4 mr-1.5" /> Export CSV
      </BaseButton>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div>
        <label class="block text-xs text-stone-500 mb-1">From</label>
        <input v-model="from" type="date" class="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">To</label>
        <input v-model="to" type="date" class="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">Status</label>
        <select v-model="status" class="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">Slot</label>
        <select v-model="slot" class="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <BaseButton variant="primary" size="md" @click="fetchData" :loading="loading">Apply</BaseButton>
    </div>

    <BaseTable :columns="columns" :data="rows" :loading="loading" empty-text="No orders found.">
      <template #cell-deliveryDate="{ value }">{{ fmtDate(value) }}</template>
      <template #cell-total="{ value }">RM {{ Number(value).toFixed(2) }}</template>
      <template #cell-status="{ value }"><BaseBadge color="blue">{{ value }}</BaseBadge></template>
      <template #cell-driverName="{ value }">{{ value || '—' }}</template>
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
const from = ref(new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0])
const to = ref(today())
const status = ref('')
const slot = ref('')
const rows = ref<any[]>([])
const loading = ref(false)

const statuses = ['PENDING', 'CONFIRMED', 'PICKING', 'CUTTING', 'PACKING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']

const columns = [
  { key: 'orderNumber', label: 'Order #' },
  { key: 'customerName', label: 'Customer' },
  { key: 'deliveryDate', label: 'Delivery Date' },
  { key: 'slot', label: 'Slot' },
  { key: 'status', label: 'Status' },
  { key: 'driverName', label: 'Driver' },
  { key: 'total', label: 'Total' },
]

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-MY') }

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/orders', { params: { from: from.value, to: to.value, status: status.value || undefined, slot: slot.value || undefined } })
    rows.value = data.data
  } finally { loading.value = false }
}

function exportCsv() {
  const ws = XLSX.utils.json_to_sheet(rows.value.map(r => ({
    'Order #': r.orderNumber,
    Customer: r.customerName,
    Phone: r.contactPhone,
    'Delivery Date': fmtDate(r.deliveryDate),
    Slot: r.slot,
    Status: r.status,
    Driver: r.driverName || '',
    Total: Number(r.total).toFixed(2),
  })))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orders')
  XLSX.writeFile(wb, `orders-${from.value}-to-${to.value}.csv`, { bookType: 'csv' })
}

onMounted(fetchData)
</script>
