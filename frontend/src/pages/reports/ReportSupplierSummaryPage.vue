<template>
  <div>
    <div class="mb-6">
      <p class="text-xs text-stone-400 mb-1">Report &gt; Supplier Summary</p>
      <h2 class="text-lg font-semibold text-stone-900">Supplier Summary</h2>
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
      <div class="flex-1 min-w-[250px]">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input
          v-model="search"
          type="text"
          placeholder="Search Product / Supplier..."
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
          @keyup.enter="generate"
        />
      </div>
      <button
        @click="generate"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :disabled="loading"
      >
        Generate
      </button>
      <BaseButton variant="secondary" size="md" disabled>
        <Plus class="w-4 h-4 mr-1.5" /> Add Record
      </BaseButton>
    </div>

    <div v-if="!generated" class="bg-white border border-stone-200 rounded-xl p-12 text-center">
      <FileText class="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <p class="text-stone-500 text-sm">No data found. Select date range and click 'Generate'.</p>
    </div>

    <div v-else class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3">Supplier Name</th>
            <th class="px-4 py-3">Code</th>
            <th class="px-4 py-3 text-right">Invoice Count</th>
            <th class="px-4 py-3 text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr>
            <td colspan="4" class="px-4 py-8 text-center text-stone-400">Loading...</td>
          </tr>
        </tbody>
        <tbody v-else-if="!rows.length">
          <tr>
            <td colspan="4" class="px-4 py-8 text-center text-stone-400">No supplier records found for the selected criteria.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="row in rows" :key="row.code" class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
            <td class="px-4 py-3 font-medium text-stone-900">{{ row.supplier?.companyName || '-' }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.supplier?.code || '-' }}</td>
            <td class="px-4 py-3 text-right text-stone-900">{{ row.invoiceCount }}</td>
            <td class="px-4 py-3 text-right text-stone-900">RM {{ Number(row.totalAmount).toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import { FileText, Plus } from 'lucide-vue-next'

const toast = useToast()
const today = () => new Date().toISOString().split('T')[0]
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] }
const from = ref(monthAgo())
const to = ref(today())
const search = ref('')
const rows = ref<any[]>([])
const loading = ref(false)
const generated = ref(false)

async function generate() {
  loading.value = true
  generated.value = true
  try {
    const { data } = await api.get('/reports/supplier-summary', {
      params: { from: from.value, to: to.value, search: search.value || undefined },
    })
    rows.value = data.data || []
  } catch {
    toast.error('Failed to load supplier summary')
  } finally {
    loading.value = false
  }
}

onMounted(() => generate())
</script>
