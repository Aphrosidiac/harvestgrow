<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Audit Logs</h1>
        <p class="text-sm text-stone-500 mt-1">Admin-only activity trail</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
      <BaseInput v-model="filters.search" placeholder="Search path / id" />
      <BaseSelect v-model="filters.entity" :options="entityOptions" placeholder="All entities" />
      <BaseSelect v-model="filters.action" :options="actionOptions" placeholder="All actions" />
      <BaseInput v-model="filters.dateFrom" type="date" />
      <BaseInput v-model="filters.dateTo" type="date" />
    </div>

    <BaseTable :columns="columns" :data="rows" :loading="loading" empty-text="No audit entries match these filters.">
      <template #cell-createdAt="{ value }">
        <span class="text-stone-500 text-xs font-mono">{{ fmt(value) }}</span>
      </template>
      <template #cell-user="{ row }">
        <span v-if="row.user" class="text-sm">{{ row.user.name }}</span>
        <span v-else class="text-stone-500 text-sm">-</span>
      </template>
      <template #cell-action="{ value }">
        <BaseBadge :color="actionColor(value)">{{ value }}</BaseBadge>
      </template>
      <template #cell-statusCode="{ value }">
        <span v-if="value" :class="value >= 400 ? 'text-red-400' : 'text-green-400'" class="font-mono text-xs">{{ value }}</span>
        <span v-else class="text-stone-500">-</span>
      </template>
      <template #cell-path="{ row }">
        <span class="font-mono text-xs text-stone-600">{{ row.method }} {{ row.path }}</span>
      </template>
      <template #actions="{ row }">
        <button v-if="row.changes" @click="openChanges(row as AuditRow)" class="p-1.5 text-stone-500 hover:text-green-600 transition-colors" title="View details">
          <Eye class="w-4 h-4" />
        </button>
      </template>
    </BaseTable>

    <BasePagination v-if="pagination.totalPages > 1" :page="pagination.page" :total="pagination.total" :limit="pagination.limit" @update:page="(p: number) => { pagination.page = p; fetchLogs() }" />

    <BaseModal v-model="showChanges" title="Audit details" size="lg">
      <pre class="text-xs font-mono text-stone-700 bg-white p-4 rounded-lg overflow-auto max-h-[60vh]">{{ selectedChanges }}</pre>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import api from '../../lib/api'
import BaseTable from '../../components/base/BaseTable.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import { Eye } from 'lucide-vue-next'

type AuditRow = {
  id: string
  createdAt: string
  userId: string | null
  user: { id: string; name: string; email: string } | null
  action: string
  entity: string
  entityId: string | null
  method: string | null
  path: string | null
  statusCode: number | null
  ipAddress: string | null
  changes: any
}

const rows = ref<AuditRow[]>([])
const loading = ref(true)
const showChanges = ref(false)
const selectedChanges = ref('')

const pagination = reactive({ page: 1, limit: 30, total: 0, totalPages: 1 })
const filters = reactive({ search: '', entity: '', action: '', dateFrom: '', dateTo: '' })

const columns = [
  { key: 'createdAt', label: 'Time' },
  { key: 'user', label: 'User' },
  { key: 'action', label: 'Action' },
  { key: 'entity', label: 'Entity' },
  { key: 'path', label: 'Request' },
  { key: 'statusCode', label: 'Status' },
]

const entityOptions = [
  { value: '', label: 'All entities' },
  { value: 'auth', label: 'Auth' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'documents', label: 'Documents' },
  { value: 'stock', label: 'Stock' },
  { value: 'customers', label: 'Customers' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'purchase-invoices', label: 'Purchase Invoices' },
  { value: 'supplier-payments', label: 'Supplier Payments' },
  { value: 'staff', label: 'Staff' },
]

const actionOptions = [
  { value: '', label: 'All actions' },
  { value: 'REQUEST', label: 'Request' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'ASSISTANT_TOOL', label: 'Assistant Tool' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
]

function actionColor(a: string): any {
  if (a === 'LOGIN') return 'green'
  if (a === 'LOGIN_FAILED') return 'red'
  if (a === 'ASSISTANT_TOOL') return 'blue'
  if (a === 'DELETE') return 'red'
  if (a === 'CREATE') return 'green'
  if (a === 'UPDATE') return 'gold'
  return 'gray'
}

function fmt(d: string) {
  return new Date(d).toLocaleString('en-MY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function openChanges(row: AuditRow) {
  selectedChanges.value = JSON.stringify(row.changes, null, 2)
  showChanges.value = true
}

let searchTimeout: ReturnType<typeof setTimeout>
watch(filters, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { pagination.page = 1; fetchLogs() }, 300)
}, { deep: true })

async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: pagination.page, limit: pagination.limit }
    if (filters.search) params.search = filters.search
    if (filters.entity) params.entity = filters.entity
    if (filters.action) params.action = filters.action
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo
    const { data } = await api.get('/audit', { params })
    rows.value = data.data
    pagination.total = data.pagination.total
    pagination.totalPages = data.pagination.totalPages
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

onMounted(() => fetchLogs())
</script>
