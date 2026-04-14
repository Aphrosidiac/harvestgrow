<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Sales Report</h2>
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
        <label class="block text-xs text-stone-500 mb-1">Payment</label>
        <select v-model="paymentStatus" class="bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>
      <BaseButton variant="primary" size="md" @click="fetchData" :loading="loading">Apply</BaseButton>
    </div>

    <div v-if="totals" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">Orders</p>
        <p class="text-xl font-bold">{{ totals.count }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">Subtotal</p>
        <p class="text-xl font-bold">RM {{ totals.subtotal.toFixed(2) }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">Total</p>
        <p class="text-xl font-bold">RM {{ totals.total.toFixed(2) }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase">Paid</p>
        <p class="text-xl font-bold text-green-600">RM {{ totals.paid.toFixed(2) }}</p>
      </div>
    </div>

    <BaseTable :columns="columns" :data="rows" :loading="loading" empty-text="No sales found.">
      <template #cell-date="{ value }">{{ fmtDate(value) }}</template>
      <template #cell-total="{ value }">RM {{ Number(value).toFixed(2) }}</template>
      <template #cell-subtotal="{ value }">RM {{ Number(value).toFixed(2) }}</template>
      <template #cell-paidAmount="{ value }">RM {{ Number(value).toFixed(2) }}</template>
      <template #cell-paymentStatus="{ value }">
        <BaseBadge :color="value === 'PAID' ? 'green' : value === 'PARTIAL' ? 'gold' : 'red'">{{ value }}</BaseBadge>
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
const from = ref(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
const to = ref(today())
const paymentStatus = ref('')
const rows = ref<any[]>([])
const totals = ref<{ count: number; subtotal: number; total: number; paid: number } | null>(null)
const loading = ref(false)

const columns = [
  { key: 'orderNumber', label: 'Order #' },
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'itemsCount', label: 'Items' },
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'total', label: 'Total' },
  { key: 'paidAmount', label: 'Paid' },
  { key: 'paymentStatus', label: 'Status' },
]

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-MY') }

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/sales', { params: { from: from.value, to: to.value, paymentStatus: paymentStatus.value || undefined } })
    rows.value = data.data
    totals.value = data.totals
  } finally { loading.value = false }
}

function exportCsv() {
  const out = rows.value.map(r => ({
    'Order #': r.orderNumber,
    Date: fmtDate(r.date),
    Customer: r.customerName,
    Phone: r.contactPhone,
    Items: r.itemsCount,
    Subtotal: Number(r.subtotal).toFixed(2),
    Total: Number(r.total).toFixed(2),
    Paid: Number(r.paidAmount).toFixed(2),
    Status: r.paymentStatus,
  }))
  if (totals.value) out.push({
    'Order #': 'TOTAL', Date: '', Customer: '', Phone: '', Items: totals.value.count as any,
    Subtotal: totals.value.subtotal.toFixed(2),
    Total: totals.value.total.toFixed(2),
    Paid: totals.value.paid.toFixed(2),
    Status: '',
  })
  const ws = XLSX.utils.json_to_sheet(out)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sales')
  XLSX.writeFile(wb, `sales-${from.value}-to-${to.value}.csv`, { bookType: 'csv' })
}

onMounted(fetchData)
</script>
