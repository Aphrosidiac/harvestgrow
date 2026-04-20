<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Pricing Edit Board</h2>
    </div>

    <!-- Tabs + Search -->
    <div class="flex items-center gap-4 mb-6">
      <div class="relative max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input v-model="search" type="text" placeholder="Search..." class="w-full bg-stone-200 border border-stone-300 rounded-lg pl-10 pr-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
      <div class="flex items-center rounded-lg border border-stone-300 overflow-hidden ml-2">
        <button v-for="tab in viewTabs" :key="tab.value" @click="activeView = tab.value" :class="['px-4 py-1.5 text-sm font-medium transition-colors', activeView === tab.value ? 'bg-green-600 text-white' : 'bg-stone-200 text-stone-600 hover:bg-stone-300']">
          <component :is="tab.icon" class="w-4 h-4 inline mr-1" />{{ tab.label }}
        </button>
      </div>
    </div>

    <!-- List View -->
    <div v-if="activeView === 'list'">
      <div v-if="loading" class="text-center text-stone-500 py-12">Loading...</div>
      <div v-else-if="!termSections.length" class="text-center text-stone-500 py-12">No pricing boards found.</div>

      <div v-else v-for="section in termSections" :key="section.termDays" class="mb-8">
        <!-- Section header -->
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <h3 class="text-base font-semibold text-stone-900">{{ termLabel(section.termDays) }}</h3>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-medium">{{ section.boards.length }} Boards</span>
          </div>
          <BaseButton variant="primary" size="sm" @click="openCreateModal(section.termDays)">
            <Plus class="w-4 h-4 mr-1" /> New Price
          </BaseButton>
        </div>

        <!-- Customer group tags -->
        <div class="flex flex-wrap gap-2 mb-3">
          <span v-for="tag in section.groupTags" :key="tag.name" class="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-200 text-xs text-stone-600">
            <Users class="w-3 h-3" />
            {{ tag.name }} <span class="text-stone-400">({{ tag.count }})</span>
          </span>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl mb-2">
          <table class="w-full text-sm text-left">
            <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
              <tr>
                <th class="px-4 py-3 font-medium">Reference Name</th>
                <th class="px-4 py-3 font-medium">Valid From</th>
                <th class="px-4 py-3 font-medium">Valid To</th>
                <th class="px-4 py-3 font-medium">Remarks</th>
                <th class="px-4 py-3 font-medium">Status</th>
                <th class="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-200">
              <tr v-if="!section.boards.length">
                <td colspan="6" class="px-4 py-6 text-center text-stone-400 text-sm italic">No active pricing boards for {{ termLabel(section.termDays) }}</td>
              </tr>
              <tr v-else v-for="board in section.boards" :key="board.id" class="hover:bg-stone-200/30 transition-colors">
                <td class="px-4 py-3 text-stone-900 font-medium">{{ board.name }}</td>
                <td class="px-4 py-3 text-stone-600">{{ formatDateShort(board.validFrom) }}</td>
                <td class="px-4 py-3 text-stone-600">{{ formatDateShort(board.validTo) }}</td>
                <td class="px-4 py-3 text-stone-500">{{ board.remarks || '-' }}</td>
                <td class="px-4 py-3">
                  <BaseBadge :color="board.status === 'PROCEED' ? 'green' : board.status === 'DRAFT' ? 'blue' : 'gray'">
                    {{ board.status }}
                  </BaseBadge>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button @click="openEditModal(board)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit"><Pencil class="w-4 h-4" /></button>
                    <button @click="handleCopy(board)" class="p-1.5 text-stone-500 hover:text-green-500 transition-colors" title="Copy"><Copy class="w-4 h-4" /></button>
                    <button v-if="board.status === 'DRAFT'" @click="handleStatusChange(board, 'PROCEED')" class="p-1.5 text-stone-500 hover:text-green-600 transition-colors" title="Proceed"><CheckCircle class="w-4 h-4" /></button>
                    <button v-if="board.status === 'DRAFT'" @click="confirmDelete(board)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 class="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Calendar / History stubs -->
    <div v-else class="bg-white border border-stone-200 rounded-xl p-12 text-center">
      <Construction class="w-12 h-12 text-stone-400 mx-auto mb-3" />
      <p class="text-stone-500">{{ activeView === 'calendar' ? 'Calendar view' : 'History view' }} is under development.</p>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal v-model="showModal" :title="editing ? 'Edit Pricing Board' : 'New Pricing Board'" size="md">
      <div class="space-y-4">
        <BaseInput v-model="form.name" label="Reference Name" placeholder="e.g. First, 0104 TO 3004" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.validFrom" label="Valid From" type="date" required />
          <BaseInput v-model="form.validTo" label="Valid To" type="date" required />
        </div>
        <BaseSelect v-model="form.termDays" label="Term (Days)">
          <option value="3">3 Days</option>
          <option value="7">7 Days</option>
          <option value="30">30 Days</option>
          <option value="365">12 Months</option>
        </BaseSelect>
        <BaseInput v-model="form.remarks" label="Remarks" placeholder="Optional notes" />
        <div>
          <label class="block text-xs text-stone-500 mb-2">Customer Groups</label>
          <div class="flex flex-wrap gap-2">
            <label v-for="g in allGroups" :key="g.id" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer text-sm" :class="form.customerGroupIds.includes(g.id) ? 'border-green-600 bg-green-600/10 text-green-600' : 'border-stone-300 bg-stone-100 text-stone-600 hover:bg-stone-200'">
              <input type="checkbox" :value="g.id" v-model="form.customerGroupIds" class="accent-green-600 w-3.5 h-3.5" />
              {{ g.name }}
            </label>
          </div>
          <p v-if="!allGroups.length" class="text-xs text-stone-400 mt-1">No customer groups found. Create groups in Master Data first.</p>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">{{ editing ? 'Update' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <!-- Delete Modal -->
    <BaseModal v-model="showDeleteModal" title="Delete Pricing Board" size="sm">
      <p class="text-stone-600 text-sm">Delete <strong>{{ deleteTarget?.name }}</strong>?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="deleting" @click="handleDelete" class="!bg-red-500 hover:!bg-red-600">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import { Search, Plus, Pencil, Copy, Trash2, CheckCircle, List, Calendar, Clock, Users, Construction } from 'lucide-vue-next'

const toast = useToast()

const boards = ref<any[]>([])
const allGroups = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const activeView = ref('list')
const saving = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editing = ref<string | null>(null)
const deleteTarget = ref<any>(null)

const viewTabs = [
  { label: 'List', value: 'list', icon: List },
  { label: 'Calendar', value: 'calendar', icon: Calendar },
  { label: 'History', value: 'history', icon: Clock },
]

const form = reactive({
  name: '',
  validFrom: '',
  validTo: '',
  termDays: '7',
  remarks: '',
  customerGroupIds: [] as string[],
})

const termSections = computed(() => {
  const termOrder = [365, 30, 7, 3]
  const grouped: Record<number, any[]> = {}

  for (const b of boards.value) {
    if (search.value && !b.name.toLowerCase().includes(search.value.toLowerCase())) continue
    if (!grouped[b.termDays]) grouped[b.termDays] = []
    grouped[b.termDays].push(b)
  }

  const allTerms = new Set([...termOrder, ...Object.keys(grouped).map(Number)])

  return [...allTerms].sort((a, b) => b - a).map((td) => {
    const sectionBoards = grouped[td] || []
    const groupMap = new Map<string, { name: string; count: number }>()
    for (const b of sectionBoards) {
      for (const g of b.groups || []) {
        const key = g.customerGroup.id
        if (!groupMap.has(key)) groupMap.set(key, { name: g.customerGroup.name, count: 0 })
        groupMap.get(key)!.count += b._count?.items || 0
      }
    }
    return {
      termDays: td,
      boards: sectionBoards,
      groupTags: [...groupMap.values()],
    }
  }).filter((s) => s.boards.length > 0 || !search.value)
})

function termLabel(days: number): string {
  if (days >= 365) return '12 Months'
  return `${days} Days`
}

function formatDateShort(d: string): string {
  return new Date(d).toISOString().slice(0, 10)
}

function openCreateModal(termDays?: number) {
  editing.value = null
  Object.assign(form, { name: '', validFrom: '', validTo: '', termDays: String(termDays || 7), remarks: '', customerGroupIds: [] })
  showModal.value = true
}

function openEditModal(b: any) {
  editing.value = b.id
  Object.assign(form, {
    name: b.name,
    validFrom: formatDateShort(b.validFrom),
    validTo: formatDateShort(b.validTo),
    termDays: String(b.termDays),
    remarks: b.remarks || '',
    customerGroupIds: (b.groups || []).map((g: any) => g.customerGroup.id),
  })
  showModal.value = true
}

function confirmDelete(b: any) { deleteTarget.value = b; showDeleteModal.value = true }

async function fetchBoards() {
  loading.value = true
  try {
    const { data } = await api.get('/pricing-boards', { params: { limit: '200' } })
    boards.value = data.data
  } catch {} finally { loading.value = false }
}

async function fetchGroups() {
  try { const { data } = await api.get('/customer-groups', { params: { limit: '100' } }); allGroups.value = data.data } catch {}
}

async function handleSave() {
  saving.value = true
  try {
    const payload = {
      name: form.name,
      termDays: parseInt(form.termDays),
      validFrom: form.validFrom,
      validTo: form.validTo,
      remarks: form.remarks,
      customerGroupIds: form.customerGroupIds,
    }
    if (editing.value) {
      await api.put(`/pricing-boards/${editing.value}`, payload)
      toast.success('Board updated')
    } else {
      await api.post('/pricing-boards', payload)
      toast.success('Board created')
    }
    showModal.value = false; fetchBoards()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save') } finally { saving.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return; deleting.value = true
  try { await api.delete(`/pricing-boards/${deleteTarget.value.id}`); toast.success('Board deleted'); showDeleteModal.value = false; fetchBoards() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete') } finally { deleting.value = false }
}

async function handleCopy(b: any) {
  try { await api.post(`/pricing-boards/${b.id}/copy`); toast.success('Board copied'); fetchBoards() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed to copy') }
}

async function handleStatusChange(b: any, status: string) {
  try { await api.patch(`/pricing-boards/${b.id}/status`, { status }); toast.success(`Status changed to ${status}`); fetchBoards() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed to update status') }
}

onMounted(() => { fetchBoards(); fetchGroups() })
</script>
