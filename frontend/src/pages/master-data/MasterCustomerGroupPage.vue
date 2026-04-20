<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Customer Group</h2>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" size="sm" disabled><Download class="w-4 h-4 mr-1" /> Export</BaseButton>
        <BaseButton variant="primary" size="sm" @click="openCreateModal"><Plus class="w-4 h-4 mr-1" /> Add New Group</BaseButton>
      </div>
    </div>

    <div class="flex items-end gap-4 mb-6">
      <div class="flex-1 max-w-sm">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input v-model="search" type="text" placeholder="Customer Name/Customer Code" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">Status</label>
        <select v-model="filterStatus" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-12">No.</th>
            <th class="px-4 py-3 font-medium">Customer Group</th>
            <th class="px-4 py-3 font-medium">Term</th>
            <th class="px-4 py-3 font-medium">Country</th>
            <th class="px-4 py-3 font-medium">Price</th>
            <th class="px-4 py-3 font-medium">Method</th>
            <th class="px-4 py-3 font-medium">Value</th>
            <th class="px-4 py-3 font-medium">Quotation Template</th>
            <th class="px-4 py-3 font-medium">Cust. Validation</th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading"><td colspan="10" class="px-4 py-12 text-center text-stone-500">Loading...</td></tr>
          <tr v-else-if="!groups.length"><td colspan="10" class="px-4 py-12 text-center text-stone-500">No customer groups found.</td></tr>
          <tr v-else v-for="(g, idx) in groups" :key="g.id" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ g.name }}</td>
            <td class="px-4 py-3 text-stone-600">{{ g.term }} Days</td>
            <td class="px-4 py-3 text-stone-600">{{ g.country || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ g.priceType || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ g.method || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ g.value != null ? Number(g.value).toFixed(3) : '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ g.quotationTemplate || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ g.custValidation || '-' }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="openEditModal(g)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors"><Pencil class="w-4 h-4" /></button>
                <button @click="confirmDelete(g)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors"><Trash2 class="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />

    <BaseModal v-model="showModal" :title="editing ? 'Edit Customer Group' : 'Add Customer Group'" size="md">
      <div class="space-y-4">
        <BaseInput v-model="form.name" label="Group Name" placeholder="e.g. MUSTAFA" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model.number="form.term" label="Term (Days)" type="number" />
          <BaseInput v-model="form.country" label="Country" placeholder="e.g. Singapore" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <BaseInput v-model="form.priceType" label="Price Type" placeholder="e.g. Fixed Price" />
          <BaseInput v-model="form.method" label="Method" placeholder="Method" />
          <BaseInput v-model.number="form.value" label="Value" type="number" step="0.001" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.quotationTemplate" label="Quotation Template" placeholder="Template" />
          <BaseInput v-model="form.custValidation" label="Cust. Validation" placeholder="Validation rule" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">{{ editing ? 'Update' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="showDeleteModal" title="Delete Customer Group" size="sm">
      <p class="text-stone-600 text-sm">Delete <strong>{{ deleteTarget?.name }}</strong>?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="deleting" @click="handleDelete" class="!bg-red-500 hover:!bg-red-600">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, reactive } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil, Trash2, Download } from 'lucide-vue-next'

const toast = useToast()
const groups = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const saving = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editing = ref<string | null>(null)
const deleteTarget = ref<any>(null)

const form = reactive({ name: '', term: 7, country: '', priceType: '', method: '', value: 0, quotationTemplate: '', custValidation: '' })

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (v) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { debouncedSearch.value = v; page.value = 1 }, 300) })

async function fetchGroups() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), limit: String(limit.value) }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/customer-groups', { params })
    groups.value = data.data; total.value = data.total
  } catch {} finally { loading.value = false }
}

function openCreateModal() { editing.value = null; Object.assign(form, { name: '', term: 7, country: '', priceType: '', method: '', value: 0, quotationTemplate: '', custValidation: '' }); showModal.value = true }
function openEditModal(g: any) { editing.value = g.id; Object.assign(form, { name: g.name, term: g.term, country: g.country || '', priceType: g.priceType || '', method: g.method || '', value: g.value ? Number(g.value) : 0, quotationTemplate: g.quotationTemplate || '', custValidation: g.custValidation || '' }); showModal.value = true }
function confirmDelete(g: any) { deleteTarget.value = g; showDeleteModal.value = true }

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) { await api.put(`/customer-groups/${editing.value}`, form); toast.success('Group updated') }
    else { await api.post('/customer-groups', form); toast.success('Group created') }
    showModal.value = false; fetchGroups()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save') } finally { saving.value = false }
}
async function handleDelete() {
  if (!deleteTarget.value) return; deleting.value = true
  try { await api.delete(`/customer-groups/${deleteTarget.value.id}`); toast.success('Group deleted'); showDeleteModal.value = false; fetchGroups() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete') } finally { deleting.value = false }
}

watch([debouncedSearch, filterStatus, page, limit], () => fetchGroups())
onMounted(() => fetchGroups())
</script>
