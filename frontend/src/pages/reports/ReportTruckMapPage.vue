<template>
  <div>
    <div class="mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Truck Map</h2>
      <p class="text-sm text-stone-500">Truck Map Report</p>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div>
        <label class="block text-xs text-stone-500 mb-1">Select Delivery Date</label>
        <input
          v-model="date"
          type="date"
          class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
        />
      </div>
      <div class="min-w-[200px]">
        <label class="block text-xs text-stone-500 mb-1">Filter by Truck</label>
        <select
          v-model="truckId"
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50"
        >
          <option value="">All Trucks</option>
          <option v-for="t in trucks" :key="t.id" :value="t.id">{{ t.code }} — {{ t.description }}</option>
        </select>
      </div>
      <button
        @click="fetchData"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :disabled="loading"
      >
        View Report
      </button>
      <BaseButton variant="secondary" size="md" disabled>
        <Download class="w-4 h-4 mr-1.5" /> Export Data
      </BaseButton>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3">Level</th>
            <th class="px-4 py-3">Short Code</th>
            <th class="px-4 py-3">State</th>
            <th class="px-4 py-3">City</th>
            <th class="px-4 py-3">Customer Code</th>
            <th class="px-4 py-3">Company Name</th>
            <th class="px-4 py-3">Truck</th>
            <th class="px-4 py-3">Contact</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr>
            <td colspan="8" class="px-4 py-8 text-center text-stone-400">Loading...</td>
          </tr>
        </tbody>
        <tbody v-else-if="!rows.length">
          <tr>
            <td colspan="8" class="px-4 py-8 text-center text-stone-400">No truck map data found. Select a date and click 'View Report'.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="row in rows" :key="row.customerCode" class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
            <td class="px-4 py-3 text-stone-700">{{ row.level }}</td>
            <td class="px-4 py-3 font-medium text-stone-900">{{ row.shortCode }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.state }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.city }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.customerCode }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.companyName }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.truck }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.contact }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4">
      <p class="text-sm text-stone-500">
        Total Records: {{ rows.length }}
        <span v-if="totalUnfiltered && totalUnfiltered !== rows.length"> (Filtered from {{ totalUnfiltered }})</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import { Download } from 'lucide-vue-next'

const toast = useToast()
const today = () => new Date().toISOString().split('T')[0]
const date = ref(today())
const truckId = ref('')
const trucks = ref<any[]>([])
const rows = ref<any[]>([])
const totalUnfiltered = ref(0)
const loading = ref(false)

async function fetchTrucks() {
  try {
    const { data } = await api.get('/trucks', { params: { limit: 500 } })
    trucks.value = data.data || []
  } catch {
    toast.error('Failed to load trucks')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/truck-map', {
      params: {
        date: date.value,
        truckId: truckId.value || undefined,
      },
    })
    rows.value = data.data || []
    totalUnfiltered.value = data.total || rows.value.length
  } catch {
    toast.error('Failed to load truck map data')
  } finally {
    loading.value = false
  }
}

onMounted(fetchTrucks)
</script>
