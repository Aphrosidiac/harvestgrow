<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="text-stone-500 hover:text-stone-700 transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h2 class="text-lg font-semibold text-stone-900">Stock History</h2>
          <p v-if="item" class="text-stone-500 text-sm">
            <span class="font-mono text-green-600">{{ item.itemCode }}</span> — {{ item.description }}
            <span class="ml-2 text-stone-500">(Current: {{ item.quantity }} {{ item.uom }})</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" size="sm" @click="showAdjustModal = true">
          <PlusCircle class="w-4 h-4 mr-1" /> Adjust Stock
        </BaseButton>
        <BaseButton variant="secondary" size="sm" @click="handleExportPdf" :disabled="!stock.history.length">
          <FileDown class="w-4 h-4 mr-1" /> Export PDF
        </BaseButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4">
      <select
        v-model="typeFilter"
        @change="fetchData"
        class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50"
      >
        <option value="">All Types</option>
        <option value="IN">IN</option>
        <option value="OUT">OUT</option>
        <option value="ADJUSTMENT">ADJUSTMENT</option>
      </select>
      <input v-model="dateFrom" type="date" @change="fetchData" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      <span class="text-stone-500 text-sm">to</span>
      <input v-model="dateTo" type="date" @change="fetchData" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
    </div>

    <!-- History Table -->
    <BaseTable :columns="columns" :data="stock.history" :loading="stock.historyLoading" empty-text="No stock movements recorded.">
      <template #cell-createdAt="{ value }">
        {{ new Date(value).toLocaleString('en-MY') }}
      </template>
      <template #cell-type="{ value }">
        <BaseBadge :color="value === 'IN' ? 'green' : value === 'OUT' ? 'red' : 'gray'">{{ value }}</BaseBadge>
      </template>
      <template #cell-quantity="{ row }">
        <span :class="row.type === 'IN' ? 'text-green-400' : 'text-red-400'" class="font-medium">
          {{ row.type === 'IN' ? '+' : '-' }}{{ row.quantity }}
        </span>
      </template>
      <template #cell-previousQty="{ row }">
        <span class="text-stone-500">{{ row.previousQty }}</span>
        <span class="text-stone-400 mx-1">→</span>
        <span class="text-stone-700 font-medium">{{ row.newQty }}</span>
      </template>
      <template #cell-reason="{ row }">
        <span class="text-stone-600">{{ row.reason }}</span>
        <RouterLink v-if="row.document" :to="`/app/documents/${row.documentId}`" class="text-green-600 text-xs ml-1 hover:text-green-500">
          {{ row.document.documentNumber }}
        </RouterLink>
      </template>
      <template #cell-createdBy="{ row }">
        {{ row.createdBy?.name || '—' }}
      </template>
    </BaseTable>

    <BasePagination
      :page="stock.historyPage"
      :total="stock.historyTotal"
      :limit="stock.limit"
      @update:page="(p) => { stock.historyPage = p; fetchData() }"
    />

    <!-- Adjust Modal -->
    <BaseModal v-model="showAdjustModal" title="Adjust Stock" size="sm">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">Type</label>
          <div class="flex gap-2">
            <button
              type="button"
              @click="adjustForm.type = 'add'"
              :class="['flex-1 py-2 rounded-lg text-sm font-medium border transition-colors', adjustForm.type === 'add' ? 'bg-green-500/10 border-green-500 text-green-400' : 'border-stone-300 text-stone-500 hover:border-stone-400']"
            >
              + Add Stock
            </button>
            <button
              type="button"
              @click="adjustForm.type = 'remove'"
              :class="['flex-1 py-2 rounded-lg text-sm font-medium border transition-colors', adjustForm.type === 'remove' ? 'bg-red-500/10 border-red-500 text-red-400' : 'border-stone-300 text-stone-500 hover:border-stone-400']"
            >
              - Remove Stock
            </button>
          </div>
        </div>
        <BaseInput v-model.number="adjustForm.quantity" label="Quantity" type="number" min="1" required />
        <BaseInput v-model="adjustForm.reason" label="Reason" placeholder="e.g. Damaged, Supplier return, Stock count" required />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showAdjustModal = false">Cancel</BaseButton>
        <BaseButton :variant="adjustForm.type === 'add' ? 'primary' : 'danger'" @click="handleAdjust" :loading="adjusting" :disabled="!adjustForm.quantity || !adjustForm.reason">
          {{ adjustForm.type === 'add' ? 'Add' : 'Remove' }} {{ adjustForm.quantity || 0 }} units
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useStockStore } from '../../stores/stock'
import { useToast } from '../../composables/useToast'
import { exportStockHistoryPdf } from '../../lib/pdf-export'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseTable from '../../components/base/BaseTable.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import { ArrowLeft, PlusCircle, FileDown } from 'lucide-vue-next'
import type { StockItem } from '../../types'

const route = useRoute()
const stock = useStockStore()
const toast = useToast()

const item = ref<StockItem | null>(null)
const typeFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const showAdjustModal = ref(false)
const adjusting = ref(false)
const adjustForm = reactive({ type: 'add' as 'add' | 'remove', quantity: 1, reason: '' })

const columns = [
  { key: 'createdAt', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'quantity', label: 'Change' },
  { key: 'previousQty', label: 'Before → After' },
  { key: 'reason', label: 'Reason' },
  { key: 'createdBy', label: 'By' },
]

function fetchData() {
  stock.fetchHistory(route.params.id as string, {
    type: typeFilter.value || undefined,
    from: dateFrom.value || undefined,
    to: dateTo.value || undefined,
  })
}

async function handleAdjust() {
  if (!item.value) return
  adjusting.value = true
  try {
    const updated = await stock.adjustStock(item.value.id, adjustForm.type, adjustForm.quantity, adjustForm.reason)
    item.value = updated
    toast.success(`Stock ${adjustForm.type === 'add' ? 'added' : 'removed'}: ${adjustForm.quantity} units`)
    showAdjustModal.value = false
    adjustForm.quantity = 1
    adjustForm.reason = ''
    fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to adjust stock')
  } finally {
    adjusting.value = false
  }
}

function handleExportPdf() {
  if (!item.value || !stock.history.length) return
  exportStockHistoryPdf(item.value.itemCode, item.value.description, stock.history)
  toast.success('PDF exported')
}

onMounted(async () => {
  item.value = await stock.getItem(route.params.id as string)
  fetchData()
})
</script>
