<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Supplier Management</h2>
      <BaseButton variant="primary" size="sm" @click="openCreateModal"><Plus class="w-4 h-4 mr-1" /> Add New</BaseButton>
    </div>

    <div class="flex items-end gap-4 mb-6">
      <div class="flex-1 max-w-sm">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input v-model="search" type="text" placeholder="Search Supplier..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-12">No.</th>
            <th class="px-4 py-3 font-medium">Supplier Name</th>
            <th class="px-4 py-3 font-medium">Short Form</th>
            <th class="px-4 py-3 font-medium">Code</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading"><td colspan="6" class="px-4 py-12 text-center text-stone-500">Loading...</td></tr>
          <tr v-else-if="!suppliers.length"><td colspan="6" class="px-4 py-12 text-center text-stone-500">No suppliers found.</td></tr>
          <tr v-else v-for="(s, idx) in suppliers" :key="s.id" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ s.companyName }}</td>
            <td class="px-4 py-3 text-stone-600">{{ s.shortForm || '-' }}</td>
            <td class="px-4 py-3 font-mono text-xs text-stone-700">{{ s.code || '-' }}</td>
            <td class="px-4 py-3"><BaseBadge :color="s.isActive ? 'green' : 'red'">{{ s.isActive ? 'Active' : 'Inactive' }}</BaseBadge></td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="openEditModal(s)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors"><Pencil class="w-4 h-4" /></button>
                <button @click="confirmDelete(s)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors"><Trash2 class="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />

    <BaseModal v-model="showModal" :title="editing ? 'Edit Supplier' : 'Add Supplier'" size="md">
      <div class="space-y-4">
        <BaseInput v-model="form.companyName" label="Supplier Name" placeholder="Company name" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.shortForm" label="Short Form" placeholder="e.g. BINDU" />
          <BaseInput v-model="form.code" label="Code" placeholder="e.g. 400-B0001" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.contactName" label="Contact Name" placeholder="Contact person" />
          <BaseInput v-model="form.phone" label="Phone" placeholder="+60..." />
        </div>
        <BaseInput v-model="form.email" label="Email" type="email" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">{{ editing ? 'Update' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="showDeleteModal" title="Delete Supplier" size="sm">
      <p class="text-stone-600 text-sm">Delete <strong>{{ deleteTarget?.companyName }}</strong>?</p>
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
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'

const toast = useToast()
const suppliers = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const saving = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editing = ref<string | null>(null)
const deleteTarget = ref<any>(null)

const form = reactive({ companyName: '', shortForm: '', code: '', contactName: '', phone: '', email: '' })

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (v) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { debouncedSearch.value = v; page.value = 1 }, 300) })

async function fetchSuppliers() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), limit: String(limit.value) }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    const { data } = await api.get('/suppliers', { params })
    suppliers.value = data.data; total.value = data.total
  } catch {} finally { loading.value = false }
}

function openCreateModal() { editing.value = null; Object.assign(form, { companyName: '', shortForm: '', code: '', contactName: '', phone: '', email: '' }); showModal.value = true }
function openEditModal(s: any) { editing.value = s.id; Object.assign(form, { companyName: s.companyName || '', shortForm: s.shortForm || '', code: s.code || '', contactName: s.contactName || '', phone: s.phone || '', email: s.email || '' }); showModal.value = true }
function confirmDelete(s: any) { deleteTarget.value = s; showDeleteModal.value = true }

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) { await api.put(`/suppliers/${editing.value}`, form); toast.success('Supplier updated') }
    else { await api.post('/suppliers', form); toast.success('Supplier created') }
    showModal.value = false; fetchSuppliers()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save') } finally { saving.value = false }
}
async function handleDelete() {
  if (!deleteTarget.value) return; deleting.value = true
  try { await api.delete(`/suppliers/${deleteTarget.value.id}`); toast.success('Supplier deleted'); showDeleteModal.value = false; fetchSuppliers() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete') } finally { deleting.value = false }
}

watch([debouncedSearch, page, limit], () => fetchSuppliers())
onMounted(() => fetchSuppliers())
</script>
