<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Product</h2>
    </div>

    <div class="flex items-end gap-4 mb-4">
      <div class="flex-1 max-w-sm">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input v-model="search" type="text" placeholder="Product Name/Product Code" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" size="sm" disabled>Select All</BaseButton>
        <BaseButton variant="secondary" size="sm" disabled>Group All</BaseButton>
      </div>
    </div>

    <div class="flex items-center gap-2 mb-6 flex-wrap">
      <BaseButton variant="secondary" size="sm" disabled>Download Setting</BaseButton>
      <BaseButton variant="secondary" size="sm" disabled>Audit Trail</BaseButton>
      <BaseButton variant="secondary" size="sm" disabled>Duplicate Template</BaseButton>
      <BaseButton variant="secondary" size="sm" disabled>Label Import</BaseButton>
      <BaseButton variant="secondary" size="sm" disabled><Download class="w-4 h-4 mr-1" /> Export</BaseButton>
      <BaseButton variant="primary" size="sm" @click="$router.push('/app/stock/new')"><Plus class="w-4 h-4 mr-1" /> Add Temporary Product</BaseButton>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-12">No.</th>
            <th class="px-4 py-3 font-medium">Item Picture</th>
            <th class="px-4 py-3 font-medium">Product Code</th>
            <th class="px-4 py-3 font-medium">Product Name</th>
            <th class="px-4 py-3 font-medium">Product Group</th>
            <th class="px-4 py-3 font-medium">Price</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading"><td colspan="8" class="px-4 py-12 text-center text-stone-500">Loading...</td></tr>
          <tr v-else-if="!products.length"><td colspan="8" class="px-4 py-12 text-center text-stone-500">No products found.</td></tr>
          <tr v-else v-for="(p, idx) in products" :key="p.id" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3">
              <img v-if="p.imageUrl" :src="p.imageUrl" class="w-10 h-10 rounded object-cover" />
              <div v-else class="w-10 h-10 rounded bg-stone-200 flex items-center justify-center text-stone-400"><Package class="w-5 h-5" /></div>
            </td>
            <td class="px-4 py-3 font-mono text-xs text-stone-700">{{ p.itemCode }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ p.description }}</td>
            <td class="px-4 py-3 text-stone-600">{{ p.category?.name || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ Number(p.sellPrice).toFixed(2) }}</td>
            <td class="px-4 py-3">
              <BaseBadge :color="p.isActive ? 'green' : 'red'">{{ p.isActive ? 'Active' : 'Inactive' }}</BaseBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="$router.push(`/app/stock/${p.id}/edit`)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors"><Pencil class="w-4 h-4" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil, Download, Package } from 'lucide-vue-next'

const products = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (v) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { debouncedSearch.value = v; page.value = 1 }, 300) })

async function fetchProducts() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), limit: String(limit.value) }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    const { data } = await api.get('/stock', { params })
    products.value = data.data; total.value = data.total
  } catch {} finally { loading.value = false }
}

watch([debouncedSearch, page, limit], () => fetchProducts())
onMounted(() => fetchProducts())
</script>
