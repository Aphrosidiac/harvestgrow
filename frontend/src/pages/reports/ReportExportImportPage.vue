<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Export / Import Management</h2>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div>
        <label class="block text-xs text-stone-500 mb-1">Date</label>
        <input
          v-model="date"
          type="date"
          class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
          @change="fetchData"
        />
      </div>
      <div class="flex-1 min-w-[250px]">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input
          v-model="search"
          type="text"
          placeholder="Truck Code / Description"
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
          @keyup.enter="fetchData"
        />
      </div>
      <BaseButton variant="secondary" size="md" disabled>
        <Download class="w-4 h-4 mr-1.5" /> Export
      </BaseButton>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 w-16">No</th>
            <th class="px-4 py-3">Truck Code</th>
            <th class="px-4 py-3">Description</th>
            <th class="px-4 py-3 text-right">Total Orders</th>
            <th class="px-4 py-3 text-right">Total Weight (KG)</th>
            <th class="px-4 py-3 w-24 text-center">Action</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-stone-400">Loading...</td>
          </tr>
        </tbody>
        <tbody v-else-if="!filteredRows.length">
          <tr>
            <td colspan="6" class="px-4 py-8 text-center text-stone-400">No data found for the selected date.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="(row, i) in filteredRows" :key="row.code" class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ i + 1 }}</td>
            <td class="px-4 py-3 font-medium text-stone-900">{{ row.code }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.description }}</td>
            <td class="px-4 py-3 text-right text-stone-900">{{ row.totalOrders }}</td>
            <td class="px-4 py-3 text-right text-stone-900">{{ Number(row.totalWeight).toFixed(2) }}</td>
            <td class="px-4 py-3 text-center">
              <button class="text-stone-400 hover:text-green-600 transition-colors" disabled>
                <Pencil class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import { Download, Pencil } from 'lucide-vue-next'

const toast = useToast()
const today = () => new Date().toISOString().split('T')[0]
const date = ref(today())
const search = ref('')
const rows = ref<any[]>([])
const loading = ref(false)

const filteredRows = computed(() => {
  if (!search.value) return rows.value
  const q = search.value.toLowerCase()
  return rows.value.filter(
    (r) => r.code?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
  )
})

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/export-import', {
      params: { date: date.value },
    })
    rows.value = data.data || []
  } catch {
    toast.error('Failed to load export/import data')
  } finally {
    loading.value = false
  }
}

watch(date, fetchData)
onMounted(fetchData)
</script>
