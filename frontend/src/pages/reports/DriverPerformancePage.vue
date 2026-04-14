<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Driver Performance</h2>
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
      <BaseButton variant="primary" size="md" @click="fetchData" :loading="loading">Apply</BaseButton>
    </div>

    <BaseTable :columns="columns" :data="rows" :loading="loading" empty-text="No drivers found.">
      <template #cell-successRate="{ value }">
        <span :class="value >= 90 ? 'text-green-600 font-semibold' : value >= 75 ? 'text-yellow-600' : 'text-red-500'">{{ value }}%</span>
      </template>
      <template #cell-avgDeliveryMinutes="{ value }">{{ value }} min</template>
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
const from = ref(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
const to = ref(today())
const rows = ref<any[]>([])
const loading = ref(false)

const columns = [
  { key: 'driverName', label: 'Driver' },
  { key: 'vehiclePlate', label: 'Vehicle' },
  { key: 'trips', label: 'Trips' },
  { key: 'totalStops', label: 'Stops' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'successRate', label: 'Success Rate' },
  { key: 'avgDeliveryMinutes', label: 'Avg Time' },
]

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/drivers', { params: { from: from.value, to: to.value } })
    rows.value = data.data
  } finally { loading.value = false }
}

function exportCsv() {
  const ws = XLSX.utils.json_to_sheet(rows.value)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Drivers')
  XLSX.writeFile(wb, `drivers-${from.value}-to-${to.value}.csv`, { bookType: 'csv' })
}

onMounted(fetchData)
</script>
