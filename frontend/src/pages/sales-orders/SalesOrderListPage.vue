<template>
  <div>
    <!-- Status Tabs -->
    <div class="flex items-center gap-6 border-b border-stone-200 mb-6">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        @click="activeTab = tab.value; page = 1"
        class="pb-3 text-sm font-medium border-b-2 transition-colors -mb-px"
        :class="activeTab === tab.value
          ? 'border-green-600 text-green-600'
          : 'border-transparent text-stone-500 hover:text-stone-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Search + Actions -->
    <div class="flex items-center gap-4 mb-4">
      <div class="flex-1 max-w-2xl relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Search by customer, code, sales order, or PO number..."
          class="w-full bg-stone-200 border border-stone-300 rounded-lg pl-10 pr-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
        />
      </div>
      <div class="flex items-center gap-2 ml-auto">
        <BaseButton variant="primary" size="sm" @click="$router.push('/app/sales-order/new')">
          <Plus class="w-4 h-4 mr-1" /> New Order
        </BaseButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-4 mb-6 flex-wrap">
      <div class="flex items-center gap-2 text-xs text-stone-500 uppercase font-medium">
        <span>Date Range</span>
        <input v-model="dateFrom" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        <span class="text-stone-400">—</span>
        <input v-model="dateTo" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      </div>

      <select v-model="filterCountry" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
        <option value="">All Countries</option>
        <option value="MY">Malaysia</option>
        <option value="SG">Singapore</option>
      </select>

      <div class="flex items-center rounded-lg border border-stone-300 overflow-hidden">
        <button
          v-for="slot in slotOptions"
          :key="slot.value"
          @click="filterSlot = slot.value; page = 1"
          class="px-3 py-1.5 text-sm font-medium transition-colors"
          :class="filterSlot === slot.value
            ? 'bg-green-600 text-white'
            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'"
        >
          {{ slot.label }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-3 py-3 w-10">
              <input type="checkbox" class="accent-green-600" :checked="allSelected" @change="toggleAll" />
            </th>
            <th v-for="col in sortableColumns" :key="col.key"
              class="px-4 py-3 font-medium whitespace-nowrap cursor-pointer select-none hover:text-stone-700 transition-colors"
              @click="toggleSort(col.key)"
            >
              <div class="flex items-center gap-1">
                {{ col.label }}
                <ChevronUp v-if="sortBy === col.key && sortOrder === 'asc'" class="w-3 h-3" />
                <ChevronDown v-else-if="sortBy === col.key && sortOrder === 'desc'" class="w-3 h-3" />
                <ChevronsUpDown v-else class="w-3 h-3 text-stone-300" />
              </div>
            </th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading">
            <td :colspan="sortableColumns.length + 2" class="px-4 py-12 text-center text-stone-500">Loading...</td>
          </tr>
          <tr v-else-if="!orders.length">
            <td :colspan="sortableColumns.length + 2" class="px-4 py-12 text-center text-stone-500">No sales orders found.</td>
          </tr>
          <tr v-else v-for="order in orders" :key="order.id" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-3 py-3">
              <input type="checkbox" class="accent-green-600" :checked="selected.has(order.id)" @change="toggleSelect(order.id)" />
            </td>
            <td class="px-4 py-3">
              <BaseBadge :color="statusColor(order.status)">{{ statusLabel(order.status) }}</BaseBadge>
            </td>
            <td class="px-4 py-3">
              <span class="text-green-600 font-medium font-mono text-xs">{{ order.salesOrderNumber }}</span>
            </td>
            <td class="px-4 py-3 text-stone-600">
              <div>{{ order.poNumber || '-' }}</div>
              <div v-if="order.invoiceNumber" class="text-xs text-stone-400">{{ order.invoiceNumber }}</div>
            </td>
            <td class="px-4 py-3 text-stone-600">{{ order.truck || '-' }}</td>
            <td class="px-4 py-3">
              <div class="text-stone-900">{{ formatDate(order.deliveryDate) }}</div>
              <div class="text-xs text-stone-400">Created: {{ formatDateTime(order.createdAt) }}</div>
              <div class="text-xs text-green-600 font-medium">{{ slotLabel(order.deliverySlot) }}</div>
            </td>
            <td class="px-4 py-3">
              <div class="text-stone-900 font-medium">
                {{ order.customerCompanyName || order.customerName || '-' }}
                <span v-if="order.customerCompanyCode" class="text-stone-400 text-xs">({{ order.customerCompanyCode }})</span>
              </div>
              <div v-if="order.customerBranchLocation" class="text-xs text-stone-500">
                {{ order.customerBranchLocation }}
                <span v-if="order.customerBranchCode">({{ order.customerBranchCode }})</span>
              </div>
            </td>
            <td class="px-4 py-3 text-stone-900 font-medium text-right tabular-nums">
              {{ Number(order.totalAmount).toFixed(2) }}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="$router.push(`/app/sales-order/${order.id}/edit`)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit">
                  <Pencil class="w-4 h-4" />
                </button>
                <button @click="handlePrint(order)" class="p-1.5 text-stone-500 hover:text-stone-700 transition-colors" title="Print">
                  <Printer class="w-4 h-4" />
                </button>
                <button @click="handleCopy(order)" class="p-1.5 text-stone-500 hover:text-green-500 transition-colors" title="Copy">
                  <Copy class="w-4 h-4" />
                </button>
                <button v-if="['PENDING', 'CANCELLED'].includes(order.status)" @click="confirmDelete(order)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <BasePagination :page="page" :total="totalCount" :limit="limit" @update:page="page = $event" />

    <!-- Delete Confirmation Modal -->
    <BaseModal v-model="showDeleteModal" title="Delete Sales Order" size="sm">
      <p class="text-stone-600 text-sm">Are you sure you want to delete <strong class="text-stone-900">{{ deleteTarget?.salesOrderNumber }}</strong>?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="deleting" @click="handleDelete" class="!bg-red-500 hover:!bg-red-600">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSalesOrderStore } from '../../stores/salesOrders'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Search, Plus, Pencil, Printer, Copy, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-vue-next'
import type { SalesOrder, SalesOrderStatus } from '../../types'

const store = useSalesOrderStore()
const toast = useToast()

const orders = computed(() => store.salesOrders)
const totalCount = computed(() => store.total)
const loading = computed(() => store.loading)

const search = ref('')
const activeTab = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const filterCountry = ref('')
const filterSlot = ref('')
const page = ref(1)
const limit = ref(20)
const sortBy = ref('')
const sortOrder = ref<'asc' | 'desc'>('desc')

const selected = ref(new Set<string>())
const showDeleteModal = ref(false)
const deleteTarget = ref<SalesOrder | null>(null)
const deleting = ref(false)

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Awaiting Shipment', value: 'AWAITING_SHIPMENT' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Return Order', value: 'RETURN_ORDER' },
  { label: 'Combined', value: 'COMBINED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const slotOptions = [
  { label: 'All', value: '' },
  { label: 'Afternoon', value: 'AFTERNOON' },
  { label: 'Tmr Morn', value: 'TOMORROW_MORNING' },
]

const sortableColumns = [
  { key: 'status', label: 'Status' },
  { key: 'salesOrderNumber', label: 'Sales Order No' },
  { key: 'poNumber', label: 'PO / Invoice No' },
  { key: 'truck', label: 'Truck' },
  { key: 'deliveryDate', label: 'Date' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'totalAmount', label: 'Total' },
]

function statusColor(status: SalesOrderStatus): 'blue' | 'gold' | 'green' | 'red' | 'gray' {
  switch (status) {
    case 'PENDING': return 'blue'
    case 'AWAITING_SHIPMENT': return 'gold'
    case 'COMPLETED': return 'green'
    case 'RETURN_ORDER': return 'red'
    case 'COMBINED': return 'gray'
    case 'CANCELLED': return 'gray'
    default: return 'gray'
  }
}

function statusLabel(status: SalesOrderStatus): string {
  switch (status) {
    case 'PENDING': return 'Pending'
    case 'AWAITING_SHIPMENT': return 'Awaiting Shipment'
    case 'COMPLETED': return 'Completed'
    case 'RETURN_ORDER': return 'Return Order'
    case 'COMBINED': return 'Combined'
    case 'CANCELLED': return 'Cancelled'
    default: return status
  }
}

function slotLabel(slot: string): string {
  switch (slot) {
    case 'AFTERNOON': return 'Afternoon'
    case 'TOMORROW_MORNING': return 'Tomorrow Morning'
    case 'MORNING': return 'Morning'
    default: return slot
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-CA') + ' ' + new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString('en-CA') + ' ' + new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function toggleSort(key: string) {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = key
    sortOrder.value = 'asc'
  }
  page.value = 1
}

const allSelected = computed(() => orders.value.length > 0 && orders.value.every((o) => selected.value.has(o.id)))

function toggleAll() {
  if (allSelected.value) {
    selected.value.clear()
  } else {
    orders.value.forEach((o) => selected.value.add(o.id))
  }
}

function toggleSelect(id: string) {
  if (selected.value.has(id)) {
    selected.value.delete(id)
  } else {
    selected.value.add(id)
  }
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
    page.value = 1
  }, 300)
})

async function fetchData() {
  const params: Record<string, any> = {
    page: page.value,
    limit: limit.value,
  }
  if (activeTab.value) params.status = activeTab.value
  if (debouncedSearch.value) params.search = debouncedSearch.value
  if (dateFrom.value) params.from = dateFrom.value
  if (dateTo.value) params.to = dateTo.value
  if (filterCountry.value) params.country = filterCountry.value
  if (filterSlot.value) params.deliverySlot = filterSlot.value
  if (sortBy.value) {
    params.sortBy = sortBy.value
    params.sortOrder = sortOrder.value
  }
  await store.fetchSalesOrders(params)
  selected.value.clear()
}

function confirmDelete(order: SalesOrder) {
  deleteTarget.value = order
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await store.deleteSalesOrder(deleteTarget.value.id)
    toast.success('Sales order deleted')
    showDeleteModal.value = false
    fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to delete')
  } finally {
    deleting.value = false
  }
}

async function handleCopy(order: SalesOrder) {
  try {
    const copied = await store.copySalesOrder(order.id)
    toast.success(`Copied as ${copied.salesOrderNumber}`)
    fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to copy')
  }
}

function handlePrint(order: SalesOrder) {
  toast.success(`Print ${order.salesOrderNumber} — coming soon`)
}

watch([activeTab, debouncedSearch, dateFrom, dateTo, filterCountry, filterSlot, page, sortBy, sortOrder], () => fetchData())
onMounted(() => fetchData())
</script>
