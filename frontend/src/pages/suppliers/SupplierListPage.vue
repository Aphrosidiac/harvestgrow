<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Suppliers</h2>
      <BaseButton variant="primary" size="sm" @click="$router.push('/app/suppliers/new')">
        <Plus class="w-4 h-4 mr-1" /> Add Supplier
      </BaseButton>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <input v-model="search" type="text" placeholder="Search suppliers..." class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500 w-72" />
    </div>

    <!-- Table -->
    <BaseTable :columns="columns" :data="suppliers" :loading="loading" empty-text="No suppliers found.">
      <template #cell-companyName="{ row }">
        <span class="text-stone-900 font-medium">{{ row.companyName }}</span>
        <span v-if="!row.isActive" class="ml-2 text-xs text-red-400">(Inactive)</span>
      </template>
      <template #cell-contactName="{ value }">
        <span class="text-stone-600 text-sm">{{ value || '-' }}</span>
      </template>
      <template #cell-phone="{ value }">
        <span class="text-stone-500 text-sm">{{ value || '-' }}</span>
      </template>
      <template #cell-email="{ value }">
        <span class="text-stone-500 text-sm">{{ value || '-' }}</span>
      </template>
      <template #actions="{ row }">
        <button @click="$router.push(`/app/suppliers/${row.id}/edit`)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors">
          <Pencil class="w-4 h-4" />
        </button>
      </template>
    </BaseTable>

    <BasePagination v-if="totalPages > 1" :page="page" :total="totalPages * 20" :limit="20" @update:page="(p: number) => { page = p; fetchSuppliers() }" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '../../lib/api'
import BaseTable from '../../components/base/BaseTable.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil } from 'lucide-vue-next'

const suppliers = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const page = ref(1)
const totalPages = ref(1)

const columns = [
  { key: 'companyName', label: 'Company' },
  { key: 'contactName', label: 'Contact' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
]

let searchTimeout: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1; fetchSuppliers() }, 300)
})

async function fetchSuppliers() {
  loading.value = true
  try {
    const params: Record<string, any> = { page: page.value }
    if (search.value) params.search = search.value
    const { data } = await api.get('/suppliers', { params })
    suppliers.value = data.data
    totalPages.value = data.totalPages || 1
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

onMounted(() => fetchSuppliers())
</script>
