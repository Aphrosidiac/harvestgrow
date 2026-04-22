<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          v-model="search"
          @input="debouncedFetch"
          type="text"
          placeholder="Search by name or phone..."
          class="w-full bg-stone-200 border border-stone-300 rounded-lg pl-10 pr-3 py-2 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
        />
      </div>
      <BaseButton variant="primary" size="md" @click="$router.push('/app/customers/new')">
        <Plus class="w-4 h-4 mr-1.5" /> Add Customer
      </BaseButton>
    </div>

    <BaseTable :columns="columns" :data="store.customers" :loading="store.loading" empty-text="No customers yet." mobile-cards>
      <template #cell-name="{ value, row }">
        <RouterLink :to="`/app/customers/${row.id}/edit`" class="text-green-600 hover:text-green-500 font-medium">{{ value }}</RouterLink>
      </template>
      <template #cell-phone="{ value }">
        {{ value || '—' }}
      </template>
      <template #cell-vehicles="{ row }">
        <div v-if="row.vehicles?.length" class="flex flex-wrap gap-1">
          <span v-for="v in row.vehicles" :key="v.id" class="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded font-mono">
            {{ v.plate }}
          </span>
        </div>
        <span v-else class="text-stone-500 text-sm">—</span>
      </template>
      <template #cell-_count="{ row }">
        {{ row._count?.documents || 0 }}
      </template>
      <template #actions="{ row }">
        <div class="flex items-center gap-1 justify-end">
          <RouterLink :to="`/app/customers/${row.id}/edit`" class="p-1.5 text-stone-500 hover:text-green-600 transition-colors">
            <Pencil class="w-4 h-4" />
          </RouterLink>
          <button v-if="!row._count?.documents" @click="handleDelete(row)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </template>
    </BaseTable>

    <BasePagination
      :page="store.page"
      :total="store.total"
      :limit="store.limit"
      @update:page="(p) => { store.page = p; fetchData() }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCustomerStore } from '../../stores/customers'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseTable from '../../components/base/BaseTable.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Search, Plus, Pencil, Trash2 } from 'lucide-vue-next'

const store = useCustomerStore()
const toast = useToast()
const confirm = useConfirm()
const search = ref('')

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: '_count', label: 'Documents' },
]

let timer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(timer)
  timer = setTimeout(() => { store.page = 1; fetchData() }, 300)
}

function fetchData() {
  store.fetchCustomers({ search: search.value || undefined })
}

async function handleDelete(row: any) {
  if (!(await confirm.show('Delete Customer', `Delete customer "${row.name}"?`))) return
  try {
    await store.deleteCustomer(row.id)
    toast.success('Customer deleted')
    fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to delete')
  }
}

onMounted(() => fetchData())
onUnmounted(() => clearTimeout(timer))
</script>
