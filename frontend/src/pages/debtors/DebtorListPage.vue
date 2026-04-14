<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Debtors</h2>
    </div>

    <!-- Search + Filters -->
    <div class="flex items-end gap-4 mb-6">
      <div class="flex-1 max-w-xs">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input v-model="searchQuery" type="text" placeholder="Name, company, plate, phone..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">From</label>
        <input v-model="filterFrom" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">To</label>
        <input v-model="filterTo" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      </div>
      <button @click="clearFilters" class="text-stone-500 hover:text-stone-700 text-sm px-3 py-2 transition-colors">Clear</button>
    </div>

    <!-- Summary -->
    <div v-if="debtors.length" class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">Total Outstanding</p>
        <p class="text-red-400 text-xl font-bold">RM {{ grandTotal.toFixed(2) }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">Debtors</p>
        <p class="text-stone-900 text-xl font-bold">{{ debtors.length }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">Unpaid Invoices</p>
        <p class="text-stone-900 text-xl font-bold">{{ totalInvoices }}</p>
      </div>
    </div>

    <!-- Table -->
    <BaseTable :columns="columns" :data="debtors" :loading="loading" empty-text="No outstanding debtors.">
      <template #cell-name="{ row }">
        <RouterLink :to="`/app/debtors/${encodeURIComponent(row.id)}`" class="text-stone-900 hover:text-green-600 font-medium transition-colors">
          {{ row.name }}
        </RouterLink>
      </template>
      <template #cell-phone="{ value }">
        <span class="text-stone-500 text-sm">{{ value || '—' }}</span>
      </template>
      <template #cell-plate="{ value }">
        <span v-if="value" class="text-green-600 text-sm">{{ value }}</span>
        <span v-else class="text-stone-500">—</span>
      </template>
      <template #cell-invoiceCount="{ value }">
        {{ value }}
      </template>
      <template #cell-latestIssueDate="{ value }">
        <span v-if="value" class="text-stone-600 text-sm">{{ formatDate(value) }}</span>
        <span v-else class="text-stone-500">—</span>
      </template>
      <template #cell-oldestDueDate="{ value }">
        <span v-if="value" :class="isOverdue(value) ? 'text-red-400 font-medium' : 'text-stone-600'" class="text-sm">
          {{ formatDate(value) }}
        </span>
        <span v-else class="text-stone-500">—</span>
      </template>
      <template #cell-daysOverdue="{ row }">
        <template v-if="row.oldestDueDate && daysOverdue(row.oldestDueDate) > 0">
          <span :class="[
            'font-semibold text-sm',
            daysOverdue(row.oldestDueDate) > 30 ? 'text-red-400' : daysOverdue(row.oldestDueDate) > 7 ? 'text-yellow-500' : 'text-stone-600'
          ]">
            {{ daysOverdue(row.oldestDueDate) }}d
          </span>
        </template>
        <span v-else class="text-stone-500 text-sm">—</span>
      </template>
      <template #cell-totalOwed="{ value }">
        <span class="text-red-400 font-semibold">RM {{ value.toFixed(2) }}</span>
      </template>
      <template #actions="{ row }">
        <RouterLink :to="`/app/debtors/${encodeURIComponent(row.id)}`" class="p-1.5 text-stone-500 hover:text-green-600 transition-colors">
          <Eye class="w-4 h-4" />
        </RouterLink>
      </template>
    </BaseTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../lib/api'
import BaseTable from '../../components/base/BaseTable.vue'
import { Eye } from 'lucide-vue-next'

interface Debtor {
  id: string
  name: string
  phone?: string
  plate?: string
  invoiceCount: number
  totalOwed: number
  oldestDueDate?: string
  latestIssueDate?: string
}

const debtors = ref<Debtor[]>([])
const loading = ref(true)
const searchQuery = ref('')
const debouncedSearch = ref('')
const filterFrom = ref('')
const filterTo = ref('')

let searchTimeout: ReturnType<typeof setTimeout>
watch(searchQuery, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { debouncedSearch.value = val }, 300)
})

const columns = [
  { key: 'name', label: 'Customer' },
  { key: 'phone', label: 'Phone' },
  { key: 'plate', label: 'Vehicle' },
  { key: 'invoiceCount', label: 'Invoices' },
  { key: 'latestIssueDate', label: 'Last Issued' },
  { key: 'oldestDueDate', label: 'Due Date' },
  { key: 'daysOverdue', label: 'Overdue' },
  { key: 'totalOwed', label: 'Outstanding' },
]

const grandTotal = computed(() => debtors.value.reduce((sum, d) => sum + d.totalOwed, 0))
const totalInvoices = computed(() => debtors.value.reduce((sum, d) => sum + d.invoiceCount, 0))

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(d: string) {
  return new Date(d) < new Date()
}

function daysOverdue(d: string): number {
  const diff = Date.now() - new Date(d).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function clearFilters() {
  searchQuery.value = ''
  debouncedSearch.value = ''
  filterFrom.value = ''
  filterTo.value = ''
}

async function fetchDebtors() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (debouncedSearch.value) params.search = debouncedSearch.value
    if (filterFrom.value) params.from = filterFrom.value
    if (filterTo.value) params.to = filterTo.value
    const { data } = await api.get('/debtors', { params })
    debtors.value = data.data
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

watch([debouncedSearch, filterFrom, filterTo], () => fetchDebtors())
onMounted(() => fetchDebtors())
</script>
