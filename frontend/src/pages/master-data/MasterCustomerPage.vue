<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Customer</h2>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" size="sm" disabled><Download class="w-4 h-4 mr-1" /> Export</BaseButton>
        <BaseButton variant="secondary" size="sm" disabled><Upload class="w-4 h-4 mr-1" /> Import</BaseButton>
        <BaseButton variant="secondary" size="sm" disabled><Printer class="w-4 h-4 mr-1" /> Print</BaseButton>
        <BaseButton variant="primary" size="sm" @click="openCreateModal"><Plus class="w-4 h-4 mr-1" /> Add New</BaseButton>
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
        </select>
      </div>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-12">No.</th>
            <th class="px-4 py-3 font-medium">Customer Code</th>
            <th class="px-4 py-3 font-medium">Customer Name</th>
            <th class="px-4 py-3 font-medium">Credit Terms</th>
            <th class="px-4 py-3 font-medium">Customer Group</th>
            <th class="px-4 py-3 font-medium">Quotation Template</th>
            <th class="px-4 py-3 font-medium">Arr. Book</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading"><td colspan="9" class="px-4 py-12 text-center text-stone-500">Loading...</td></tr>
          <tr v-else-if="!customers.length"><td colspan="9" class="px-4 py-12 text-center text-stone-500">No customers found.</td></tr>
          <tr v-else v-for="(c, idx) in customers" :key="c.id" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3 text-stone-700 font-mono text-xs">{{ c.companyCode || '-' }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ c.companyName || c.name }}</td>
            <td class="px-4 py-3 text-stone-600">{{ c.creditTerms || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ c.customerGroup?.name || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ c.quotationTemplate || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ c.arrBook || '-' }}</td>
            <td class="px-4 py-3"><BaseBadge color="green">Active</BaseBadge></td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="openEditModal(c)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors"><Pencil class="w-4 h-4" /></button>
                <button @click="confirmDelete(c)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors"><Trash2 class="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-1">
        <button v-for="s in [10,25,50,100]" :key="s" @click="limit = s; page = 1" :class="['px-3 py-1.5 text-sm rounded-lg transition-colors', limit === s ? 'bg-green-600 text-stone-50 font-medium' : 'text-stone-600 hover:bg-stone-200']">{{ s }}</button>
      </div>
      <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />
    </div>

    <BaseModal v-model="showModal" :title="editing ? 'Edit Customer' : 'Add Customer'" size="md">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.name" label="Name" placeholder="Customer name" required />
          <BaseInput v-model="form.companyName" label="Company Name" placeholder="Company" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.companyCode" label="Customer Code" placeholder="e.g. 300-E0001" />
          <BaseInput v-model="form.creditTerms" label="Credit Terms" placeholder="e.g. 7 Days" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <BaseSelect v-model="form.customerGroupId" label="Customer Group">
            <option value="">— None —</option>
            <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </BaseSelect>
          <BaseInput v-model="form.quotationTemplate" label="Quotation Template" placeholder="Template name" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.phone" label="Phone" placeholder="+60..." />
          <BaseInput v-model="form.email" label="Email" type="email" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <BaseInput v-model="form.country" label="Country" placeholder="e.g. Singapore" />
          <BaseInput v-model="form.branchLocation" label="Branch" placeholder="e.g. DANGA BAY" />
          <BaseInput v-model="form.arrBook" label="Arr. Book" placeholder="Arr. Book" />
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">{{ editing ? 'Update' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="showDeleteModal" title="Delete Customer" size="sm">
      <p class="text-stone-600 text-sm">Delete <strong>{{ deleteTarget?.companyName || deleteTarget?.name }}</strong>?</p>
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
import BaseSelect from '../../components/base/BaseSelect.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil, Trash2, Download, Upload, Printer } from 'lucide-vue-next'

const toast = useToast()
const customers = ref<any[]>([])
const groups = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const saving = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editing = ref<string | null>(null)
const deleteTarget = ref<any>(null)

const form = reactive({ name: '', companyName: '', companyCode: '', creditTerms: '', customerGroupId: '', quotationTemplate: '', phone: '', email: '', country: '', branchLocation: '', arrBook: '' })

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (v) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { debouncedSearch.value = v; page.value = 1 }, 300) })

async function fetchCustomers() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), limit: String(limit.value) }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    const { data } = await api.get('/customers', { params })
    customers.value = data.data
    total.value = data.total
  } catch {} finally { loading.value = false }
}

async function fetchGroups() {
  try { const { data } = await api.get('/customer-groups', { params: { limit: '100' } }); groups.value = data.data } catch {}
}

function openCreateModal() {
  editing.value = null
  Object.assign(form, { name: '', companyName: '', companyCode: '', creditTerms: '', customerGroupId: '', quotationTemplate: '', phone: '', email: '', country: '', branchLocation: '', arrBook: '' })
  showModal.value = true
}
function openEditModal(c: any) {
  editing.value = c.id
  Object.assign(form, { name: c.name || '', companyName: c.companyName || '', companyCode: c.companyCode || '', creditTerms: c.creditTerms || '', customerGroupId: c.customerGroupId || '', quotationTemplate: c.quotationTemplate || '', phone: c.phone || '', email: c.email || '', country: c.country || '', branchLocation: c.branchLocation || '', arrBook: c.arrBook || '' })
  showModal.value = true
}
function confirmDelete(c: any) { deleteTarget.value = c; showDeleteModal.value = true }

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) { await api.put(`/customers/${editing.value}`, form); toast.success('Customer updated') }
    else { await api.post('/customers', form); toast.success('Customer created') }
    showModal.value = false; fetchCustomers()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to save') } finally { saving.value = false }
}
async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try { await api.delete(`/customers/${deleteTarget.value.id}`); toast.success('Customer deleted'); showDeleteModal.value = false; fetchCustomers() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete') } finally { deleting.value = false }
}

watch([debouncedSearch, filterStatus, page, limit], () => fetchCustomers())
onMounted(() => { fetchCustomers(); fetchGroups() })
</script>
