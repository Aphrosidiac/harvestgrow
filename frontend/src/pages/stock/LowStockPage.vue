<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-stone-900 flex items-center gap-2">
          <AlertTriangle class="w-5 h-5 text-red-500" /> Low Stock Alerts
        </h2>
        <p class="text-sm text-stone-600 mt-0.5">Items at or below their minimum stock level.</p>
      </div>
      <BaseButton variant="secondary" size="md" @click="$router.push('/app/stock')">
        <ArrowLeft class="w-4 h-4 mr-1.5" /> Back to Stock
      </BaseButton>
    </div>

    <div class="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-stone-50 border-b border-stone-200">
          <tr class="text-left">
            <th class="px-4 py-2.5 font-medium text-stone-700">Item Code</th>
            <th class="px-4 py-2.5 font-medium text-stone-700">Description</th>
            <th class="px-4 py-2.5 font-medium text-stone-700">Category</th>
            <th class="px-4 py-2.5 font-medium text-stone-700">UOM</th>
            <th class="px-4 py-2.5 font-medium text-stone-700 text-right">Quantity</th>
            <th class="px-4 py-2.5 font-medium text-stone-700 text-right">Min Stock</th>
            <th class="px-4 py-2.5 font-medium text-stone-700 text-right">Ratio</th>
            <th class="px-4 py-2.5 font-medium text-stone-700"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="px-4 py-8 text-center text-stone-500">Loading...</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="8" class="px-4 py-8 text-center text-stone-500">All stock levels healthy.</td>
          </tr>
          <tr v-for="row in items" :key="row.id" class="border-t border-stone-100 hover:bg-stone-50/50">
            <td class="px-4 py-2.5 font-mono text-green-700">{{ row.itemCode }}</td>
            <td class="px-4 py-2.5 text-stone-900">{{ row.description }}</td>
            <td class="px-4 py-2.5">
              <BaseBadge v-if="row.category" color="gray">{{ row.category.name }}</BaseBadge>
              <span v-else class="text-stone-500">—</span>
            </td>
            <td class="px-4 py-2.5 text-stone-600">{{ row.uom }}</td>
            <td class="px-4 py-2.5 text-right font-semibold" :class="row.quantity === 0 ? 'text-red-600' : 'text-red-500'">{{ row.quantity }}</td>
            <td class="px-4 py-2.5 text-right text-stone-600">{{ row.minStock }}</td>
            <td class="px-4 py-2.5 text-right text-stone-600">{{ ratio(row) }}</td>
            <td class="px-4 py-2.5 text-right">
              <button @click="$router.push(`/app/stock/${row.id}/edit`)" class="text-green-600 hover:text-green-700 text-xs font-medium">Adjust →</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStockStore } from '../../stores/stock'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import { AlertTriangle, ArrowLeft } from 'lucide-vue-next'
import type { StockItem } from '../../types'

const stock = useStockStore()
const items = ref<StockItem[]>([])
const loading = ref(false)

function ratio(row: StockItem) {
  if (!row.minStock) return '—'
  return `${Math.round((row.quantity / row.minStock) * 100)}%`
}

onMounted(async () => {
  loading.value = true
  try {
    items.value = await stock.fetchLowStock()
  } finally {
    loading.value = false
  }
})
</script>
