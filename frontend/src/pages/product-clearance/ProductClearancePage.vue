<template>
  <div>
    <!-- Filters -->
    <div class="flex items-center gap-4 mb-6 flex-wrap">
      <div class="flex items-center gap-2 text-xs text-stone-500 uppercase font-medium">
        <span>Date Range</span>
        <input v-model="dateFrom" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        <span class="text-stone-400">to</span>
        <input v-model="dateTo" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      </div>
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input v-model="search" type="text" placeholder="Search Date/Status..." class="bg-stone-200 border border-stone-300 rounded-lg pl-10 pr-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3 mb-6">
      <BaseButton variant="secondary" size="sm" disabled>Clearance Settings</BaseButton>
      <BaseButton variant="primary" size="sm" @click="handleCreate" :loading="creating">
        <Plus class="w-4 h-4 mr-1" /> Create Product Clearance List
      </BaseButton>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-16">No.</th>
            <th class="px-4 py-3 font-medium">Date</th>
            <th class="px-4 py-3 font-medium text-center">Items</th>
            <th class="px-4 py-3 font-medium text-center">Status</th>
            <th class="px-4 py-3 font-medium text-center">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading">
            <td colspan="5" class="px-4 py-12 text-center text-stone-500">Loading...</td>
          </tr>
          <tr v-else-if="!lists.length">
            <td colspan="5" class="px-4 py-12 text-center text-stone-500">No clearance lists found.</td>
          </tr>
          <tr
            v-else
            v-for="(list, idx) in lists"
            :key="list.id"
            class="transition-colors"
            :class="isToday(list.date) ? 'bg-green-600/10' : 'hover:bg-stone-200/30'"
          >
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ formatDate(list.date) }}</td>
            <td class="px-4 py-3 text-stone-700 text-center">{{ list._count?.items || 0 }}</td>
            <td class="px-4 py-3 text-center">
              <BaseBadge :color="list.status === 'OPEN' ? 'green' : 'gray'">{{ list.status }}</BaseBadge>
            </td>
            <td class="px-4 py-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button @click="viewList(list)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit">
                  <Pencil class="w-4 h-4" />
                </button>
                <button v-if="list.status === 'OPEN'" @click="handleClose(list)" class="p-1.5 text-stone-500 hover:text-green-600 transition-colors" title="Close">
                  <CheckCircle class="w-4 h-4" />
                </button>
                <button v-if="list._count?.items === 0" @click="confirmDelete(list)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-1">
        <button
          v-for="s in [10, 25, 50, 100]"
          :key="s"
          @click="limit = s; page = 1"
          :class="['px-3 py-1.5 text-sm rounded-lg transition-colors', limit === s ? 'bg-green-600 text-stone-50 font-medium' : 'text-stone-600 hover:bg-stone-200']"
        >
          {{ s }}
        </button>
      </div>
      <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />
    </div>

    <!-- Delete Modal -->
    <BaseModal v-model="showDeleteModal" title="Delete Clearance List" size="sm">
      <p class="text-stone-600 text-sm">Delete clearance list for <strong>{{ deleteTarget ? formatDate(deleteTarget.date) : '' }}</strong>?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="deleting" @click="handleDelete" class="!bg-red-500 hover:!bg-red-600">Delete</BaseButton>
      </template>
    </BaseModal>

    <!-- Detail Modal -->
    <BaseModal v-model="showDetailModal" :title="'Clearance List — ' + (detailList ? formatDate(detailList.date) : '')" size="lg">
      <div v-if="loadingDetail" class="text-center text-stone-500 py-8">Loading items...</div>
      <div v-else-if="!detailList?.items?.length" class="text-center text-stone-400 py-8">No items in this clearance list.</div>
      <div v-else class="max-h-96 overflow-y-auto">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 sticky top-0">
            <tr>
              <th class="px-3 py-2 font-medium">Code</th>
              <th class="px-3 py-2 font-medium">Description</th>
              <th class="px-3 py-2 font-medium">UOM</th>
              <th class="px-3 py-2 font-medium text-right">Qty</th>
              <th class="px-3 py-2 font-medium">Reason</th>
              <th class="px-3 py-2 font-medium text-center">Cleared</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-200">
            <tr v-for="item in detailList.items" :key="item.id" class="hover:bg-stone-200/30">
              <td class="px-3 py-2 font-mono text-xs text-stone-700">{{ item.stockItem?.itemCode }}</td>
              <td class="px-3 py-2 text-stone-900">{{ item.stockItem?.description }}</td>
              <td class="px-3 py-2 text-stone-600">{{ item.stockItem?.uom }}</td>
              <td class="px-3 py-2 text-stone-700 text-right">{{ item.quantity }}</td>
              <td class="px-3 py-2 text-stone-500 text-xs">{{ item.reason || '-' }}</td>
              <td class="px-3 py-2 text-center">
                <span v-if="item.cleared" class="text-green-600">&#10003;</span>
                <span v-else class="text-stone-300">&#10005;</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showDetailModal = false">Close</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Search, Plus, Pencil, Trash2, CheckCircle } from 'lucide-vue-next'

const toast = useToast()

const lists = ref<any[]>([])
const loading = ref(true)
const creating = ref(false)
const deleting = ref(false)
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const page = ref(1)
const limit = ref(10)
const total = ref(0)

const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const showDetailModal = ref(false)
const detailList = ref<any>(null)
const loadingDetail = ref(false)

const todayStr = new Date().toISOString().slice(0, 10)

function isToday(d: string): boolean {
  return new Date(d).toISOString().slice(0, 10) === todayStr
}

function formatDate(d: string): string {
  const date = new Date(d)
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (v) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { debouncedSearch.value = v; page.value = 1 }, 300)
})

async function fetchLists() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), limit: String(limit.value) }
    if (dateFrom.value) params.from = dateFrom.value
    if (dateTo.value) params.to = dateTo.value
    if (debouncedSearch.value) params.search = debouncedSearch.value
    const { data } = await api.get('/product-clearance', { params })
    lists.value = data.data
    total.value = data.total
  } catch {} finally { loading.value = false }
}

async function handleCreate() {
  creating.value = true
  try {
    await api.post('/product-clearance', { autoPopulate: true })
    toast.success('Clearance list created for today')
    fetchLists()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to create')
  } finally { creating.value = false }
}

async function viewList(list: any) {
  showDetailModal.value = true
  loadingDetail.value = true
  try {
    const { data } = await api.get(`/product-clearance/${list.id}`)
    detailList.value = data.data
  } catch {
    toast.error('Failed to load clearance list')
  } finally { loadingDetail.value = false }
}

async function handleClose(list: any) {
  try {
    await api.patch(`/product-clearance/${list.id}/status`, { status: 'CLOSED' })
    toast.success('Clearance list closed')
    fetchLists()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to close')
  }
}

function confirmDelete(list: any) { deleteTarget.value = list; showDeleteModal.value = true }

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/product-clearance/${deleteTarget.value.id}`)
    toast.success('Clearance list deleted')
    showDeleteModal.value = false
    fetchLists()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to delete')
  } finally { deleting.value = false }
}

watch([debouncedSearch, dateFrom, dateTo, page, limit], () => fetchLists())
onMounted(() => fetchLists())
</script>
