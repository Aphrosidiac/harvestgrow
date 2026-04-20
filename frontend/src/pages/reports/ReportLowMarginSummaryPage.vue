<template>
  <div>
    <div class="mb-6">
      <p class="text-xs text-stone-400 mb-1">Report &gt; Low Margin Summary (Clearance)</p>
      <h2 class="text-lg font-semibold text-stone-900">Low Margin Summary (Clearance)</h2>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div>
        <label class="block text-xs text-stone-500 mb-1">From</label>
        <input
          v-model="from"
          type="date"
          class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
        />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">To</label>
        <input
          v-model="to"
          type="date"
          class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
        />
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input
          v-model="search"
          type="text"
          placeholder="Search Product..."
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
          @keyup.enter="generate"
        />
      </div>
      <button
        @click="generate"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :disabled="loading"
      >
        Generate Report
      </button>
    </div>

    <!-- Alert Banner -->
    <div v-if="generated" class="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <div class="flex items-center gap-2">
        <AlertTriangle class="w-5 h-5 text-red-500" />
        <span class="text-sm font-medium text-red-700">Low Margin Alerts ({{ alertCount }})</span>
      </div>
      <span class="text-xs text-red-500">Threshold: 30% of sales usage</span>
    </div>

    <div v-if="!generated" class="bg-white border border-stone-200 rounded-xl p-12 text-center">
      <FileText class="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <p class="text-stone-500 text-sm">No data found. Select date range and click 'Generate Report'.</p>
    </div>

    <div v-else class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3">Product Code</th>
            <th class="px-4 py-3">Product</th>
            <th class="px-4 py-3">UOM</th>
            <th class="px-4 py-3 text-right">Balance</th>
            <th class="px-4 py-3 text-right">Sell Price</th>
            <th class="px-4 py-3 text-right">Cost Price</th>
            <th class="px-4 py-3 text-right">Margin %</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr>
            <td colspan="7" class="px-4 py-8 text-center text-stone-400">Loading...</td>
          </tr>
        </tbody>
        <tbody v-else-if="!rows.length">
          <tr>
            <td colspan="7" class="px-4 py-8 text-center text-stone-400">No low margin products found.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="row in rows" :key="row.itemCode" class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
            <td class="px-4 py-3 font-medium text-stone-900">{{ row.itemCode }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.description }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.uom }}</td>
            <td class="px-4 py-3 text-right text-stone-900">{{ row.balance }}</td>
            <td class="px-4 py-3 text-right text-stone-900">RM {{ Number(row.sellPrice).toFixed(2) }}</td>
            <td class="px-4 py-3 text-right text-stone-900">RM {{ Number(row.costPrice).toFixed(2) }}</td>
            <td class="px-4 py-3 text-right font-medium" :class="Number(row.margin) < threshold ? 'text-red-500' : 'text-green-600'">
              {{ Number(row.margin).toFixed(1) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import { FileText, AlertTriangle } from 'lucide-vue-next'

const toast = useToast()
const today = () => new Date().toISOString().split('T')[0]
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] }
const from = ref(weekAgo())
const to = ref(today())
const search = ref('')
const rows = ref<any[]>([])
const loading = ref(false)
const generated = ref(false)
const threshold = 30

const alertCount = computed(() =>
  rows.value.filter((r) => Number(r.margin) < threshold).length
)

async function generate() {
  loading.value = true
  generated.value = true
  try {
    const { data } = await api.get('/reports/low-margin-summary', {
      params: {
        from: from.value,
        to: to.value,
        search: search.value || undefined,
        threshold,
      },
    })
    rows.value = data.data || []
  } catch {
    toast.error('Failed to load low margin summary')
  } finally {
    loading.value = false
  }
}
</script>
