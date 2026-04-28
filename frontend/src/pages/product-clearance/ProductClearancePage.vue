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
      <BaseButton variant="secondary" size="sm" @click="showSettings = true">Clearance Settings</BaseButton>
      <BaseButton variant="primary" size="sm" @click="showCreateModal = true">
        <Plus class="w-4 h-4 mr-1" /> Create Product Clearance List
      </BaseButton>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead>
          <tr class="bg-[rgb(134,153,64)] text-white">
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
            :class="isToday(list.date) ? 'bg-green-600/10' : 'hover:bg-stone-50'"
          >
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ formatDate(list.date) }}</td>
            <td class="px-4 py-3 text-stone-700 text-center">{{ list._count?.items || 0 }}</td>
            <td class="px-4 py-3 text-center">
              <BaseBadge :color="list.status === 'OPEN' ? 'green' : 'gray'">{{ list.status === 'OPEN' ? 'Open' : 'Closed' }}</BaseBadge>
            </td>
            <td class="px-4 py-3 text-center">
              <button @click="router.push(`/app/product-clearance/${list.id}`)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit">
                <Pencil class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-2 text-sm text-stone-500">
        <span>Rows per page:</span>
        <div class="flex items-center border border-stone-300 rounded-lg overflow-hidden">
          <button v-for="n in [10, 25, 50, 100]" :key="n" @click="limit = n; page = 1" :class="['px-3 py-1 text-sm transition-colors', limit === n ? 'bg-[rgb(134,153,64)] text-white font-medium' : 'bg-white text-stone-600 hover:bg-stone-100']">{{ n }}</button>
        </div>
      </div>
      <div class="flex items-center gap-4 text-sm text-stone-500">
        <span><strong class="text-stone-700">{{ total }}</strong> total</span>
        <div class="flex items-center gap-1">
          <button :disabled="page <= 1" @click="page--" class="p-1 text-stone-500 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft class="w-5 h-5" /></button>
          <span>Page</span>
          <input :value="page" @change="onPageInput" type="number" min="1" :max="totalPages" class="w-10 text-center border border-stone-300 rounded px-1 py-0.5 text-sm text-stone-900" />
          <span>/ {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="page++" class="p-1 text-stone-500 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight class="w-5 h-5" /></button>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <BaseModal v-model="showCreateModal" title="Create Clearance List" size="sm">
      <div>
        <label class="block text-sm text-stone-600 mb-1">Select Date</label>
        <input v-model="createDate" type="date" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="creating" @click="handleCreate">Add New</BaseButton>
      </template>
    </BaseModal>

    <!-- Delete Modal -->
    <BaseModal v-model="showDeleteModal" title="Delete Clearance List" size="sm">
      <p class="text-stone-600 text-sm">Delete clearance list for <strong>{{ deleteTarget ? formatDate(deleteTarget.date) : '' }}</strong>?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="deleting" @click="handleDelete" class="!bg-red-500 hover:!bg-red-600">Delete</BaseButton>
      </template>
    </BaseModal>

    <!-- Settings Modal -->
    <ClearanceSettingsModal v-model="showSettings" @saved="fetchLists" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import ClearanceSettingsModal from '../../components/product-clearance/ClearanceSettingsModal.vue'
import { Search, Plus, Pencil, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const router = useRouter()
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

const showCreateModal = ref(false)
const createDate = ref('')
const showDeleteModal = ref(false)
const deleteTarget = ref<any>(null)
const showSettings = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

function onPageInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (val >= 1 && val <= totalPages.value) page.value = val
}

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
  if (!createDate.value) { toast.error('Select a date'); return }
  creating.value = true
  try {
    const res = await api.post('/product-clearance', { date: createDate.value, autoPopulate: true })
    toast.success('Clearance list created')
    showCreateModal.value = false
    router.push(`/app/product-clearance/${res.data.data.id}`)
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to create')
  } finally { creating.value = false }
}

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
