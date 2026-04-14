<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4 flex-1">
        <!-- Search -->
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            v-model="search"
            @input="debouncedFetch"
            type="text"
            placeholder="Search by item code or description..."
            class="w-full bg-white border border-stone-200 rounded-lg pl-10 pr-3 py-2 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
          />
        </div>
        <!-- Category filter -->
        <select
          v-model="categoryFilter"
          @change="fetchData"
          class="bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50"
        >
          <option value="">All Categories</option>
          <option v-for="cat in stock.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
      <div class="flex items-center gap-2 ml-4">
        <BaseButton variant="primary" size="md" @click="handleUpdateTodaysPrice">
          <RefreshCw class="w-4 h-4 mr-1.5" /> Update Today's Price
        </BaseButton>
        <BaseButton variant="secondary" size="md" @click="handleExportPdf">
          <FileDown class="w-4 h-4 mr-1.5" /> Export PDF
        </BaseButton>
        <BaseButton variant="secondary" size="md" @click="showCategoryModal = true">
          <Tags class="w-4 h-4 mr-1.5" /> Categories
        </BaseButton>
        <BaseButton variant="primary" size="md" @click="$router.push('/app/stock/new')">
          <Plus class="w-4 h-4 mr-1.5" /> Add Item
        </BaseButton>
      </div>
    </div>

    <!-- Flat Table View -->
    <BaseTable :columns="columns" :data="stock.items" :loading="stock.loading" empty-text="No stock items found.">
      <template #cell-itemCode="{ value }">
        <span class="font-mono text-green-700">{{ value }}</span>
      </template>
      <template #cell-category="{ row }">
        <div class="flex flex-col gap-0.5">
          <BaseBadge v-if="row.category" color="gray">{{ row.category.name }}</BaseBadge>
          <span v-else class="text-stone-500">—</span>
        </div>
      </template>
      <template #cell-costPrice="{ value }">
        RM {{ Number(value).toFixed(2) }}
      </template>
      <template #cell-sellPrice="{ value }">
        RM {{ Number(value).toFixed(2) }}
      </template>
      <template #cell-quantity="{ value, row }">
        <div>
          <span :class="value <= (row.minStock ?? 5) ? 'text-red-500 font-semibold' : ''">{{ value }}</span>
          <span v-if="row.holdQuantity > 0" class="text-yellow-600 text-xs ml-1" title="On Hold">({{ row.holdQuantity }} held)</span>
        </div>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center gap-1 justify-end">
          <button @click="$router.push(`/app/stock/${row.id}/history`)" class="p-1.5 text-stone-500 hover:text-blue-500 transition-colors" title="History">
            <History class="w-4 h-4" />
          </button>
          <button @click="$router.push(`/app/stock/${row.id}/edit`)" class="p-1.5 text-stone-500 hover:text-green-600 transition-colors" title="Edit">
            <Pencil class="w-4 h-4" />
          </button>
          <button @click="confirmDelete(row as any)" class="p-1.5 text-stone-500 hover:text-red-500 transition-colors" title="Delete">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Pagination -->
    <BasePagination
      :page="stock.page"
      :total="stock.total"
      :limit="stock.limit"
      @update:page="(p) => { stock.page = p; fetchData() }"
    />

    <!-- Category Modal -->
    <BaseModal v-model="showCategoryModal" title="Manage Categories" size="md">
      <div class="space-y-3">
        <form @submit.prevent="handleAddCategory" class="flex gap-2">
          <input
            v-model="newCategoryName"
            placeholder="Category name"
            class="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50"
          />
          <input
            v-model="newCategoryCode"
            placeholder="Code"
            class="w-20 bg-white border border-stone-200 rounded-lg px-3 py-2 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50"
          />
          <BaseButton variant="primary" size="md" type="submit" :disabled="!newCategoryName">Add</BaseButton>
        </form>
        <div class="divide-y divide-stone-200 max-h-64 overflow-y-auto">
          <div v-for="cat in stock.categories" :key="cat.id" class="flex items-center justify-between py-2">
            <div>
              <span class="text-stone-900 text-sm">{{ cat.name }}</span>
              <span v-if="cat.code" class="text-stone-500 text-xs ml-2">({{ cat.code }})</span>
              <span v-if="cat._count" class="text-stone-500 text-xs ml-2">{{ cat._count.items }} items</span>
            </div>
            <button @click="handleDeleteCategory(cat.id)" class="text-stone-500 hover:text-red-500 transition-colors">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
          <p v-if="!stock.categories.length" class="py-4 text-center text-stone-500 text-sm">No categories yet.</p>
        </div>
      </div>
    </BaseModal>

    <!-- Delete Confirmation Modal -->
    <BaseModal v-model="showDeleteModal" title="Delete Item" size="sm">
      <p class="text-stone-600 text-sm">
        Are you sure you want to delete <strong class="text-stone-900">{{ itemToDelete?.itemCode }}</strong>?
      </p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="danger" @click="handleDelete" :loading="deleting">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '../../stores/stock'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseTable from '../../components/base/BaseTable.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import { Search, Plus, Pencil, Trash2, Tags, History, FileDown, RefreshCw } from 'lucide-vue-next'
import { exportStockListPdf } from '../../lib/pdf-export'
import type { StockItem } from '../../types'

const stock = useStockStore()
const toast = useToast()

const search = ref('')
const categoryFilter = ref('')
const showCategoryModal = ref(false)
const showDeleteModal = ref(false)
const itemToDelete = ref<StockItem | null>(null)
const deleting = ref(false)
const newCategoryName = ref('')
const newCategoryCode = ref('')

const columns = [
  { key: 'itemCode', label: 'Item Code' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'uom', label: 'UOM' },
  { key: 'costPrice', label: 'Cost (RM)' },
  { key: 'sellPrice', label: 'Price (RM)' },
  { key: 'quantity', label: 'Qty' },
]

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { stock.page = 1; fetchData() }, 300)
}

function fetchData() {
  stock.fetchItems({
    search: search.value || undefined,
    categoryId: categoryFilter.value || undefined,
  })
}

function confirmDelete(item: StockItem) {
  itemToDelete.value = item
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!itemToDelete.value) return
  deleting.value = true
  try {
    await stock.deleteItem(itemToDelete.value.id)
    toast.success('Item deleted')
    showDeleteModal.value = false
    fetchData()
  } catch {
    toast.error('Failed to delete item')
  } finally {
    deleting.value = false
  }
}

async function handleAddCategory() {
  if (!newCategoryName.value) return
  try {
    await stock.createCategory({ name: newCategoryName.value, code: newCategoryCode.value || undefined })
    toast.success('Category added')
    newCategoryName.value = ''
    newCategoryCode.value = ''
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to add category')
  }
}

async function handleDeleteCategory(id: string) {
  try {
    await stock.deleteCategory(id)
    toast.success('Category deleted')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to delete category')
  }
}

const router = useRouter()

function handleUpdateTodaysPrice() {
  router.push('/app/stock/daily-pricing')
}

function handleExportPdf() {
  if (stock.items.length) {
    exportStockListPdf(stock.items)
    toast.success('PDF exported')
  }
}

onMounted(() => {
  fetchData()
  stock.fetchCategories()
})

onUnmounted(() => clearTimeout(debounceTimer))
</script>
