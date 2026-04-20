<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Quotation Management</h2>
      <BaseButton variant="primary" size="sm" @click="openCreateModal"><Plus class="w-4 h-4 mr-1" /> Add New</BaseButton>
    </div>

    <div class="flex items-end gap-4 mb-6">
      <div class="flex-1 max-w-sm">
        <input v-model="search" type="text" placeholder="Quotations..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-16">No</th>
            <th class="px-4 py-3 font-medium">Quotation Type</th>
            <th class="px-4 py-3 font-medium">Template</th>
            <th class="px-4 py-3 font-medium text-center">Status</th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading"><td colspan="5" class="px-4 py-12 text-center text-stone-500">Loading...</td></tr>
          <tr v-else-if="!items.length"><td colspan="5" class="px-4 py-12 text-center text-stone-500">No quotation types found.</td></tr>
          <tr v-else v-for="(item, idx) in items" :key="item.id" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3 text-stone-900 font-semibold">{{ item.name }}</td>
            <td class="px-4 py-3 text-stone-600">{{ item.templateName || '-' }}</td>
            <td class="px-4 py-3 text-center">
              <BaseBadge :color="item.isActive ? 'green' : 'red'">{{ item.isActive ? 'Active' : 'Inactive' }}</BaseBadge>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="openEditModal(item)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit"><Pencil class="w-4 h-4" /></button>
                <button @click="handleCopy(item)" class="p-1.5 text-stone-500 hover:text-green-500 transition-colors" title="Copy"><CopyIcon class="w-4 h-4" /></button>
                <button @click="toggleActive(item)" class="p-1.5 transition-colors" :class="item.isActive ? 'text-stone-500 hover:text-orange-400' : 'text-stone-500 hover:text-green-500'" :title="item.isActive ? 'Deactivate' : 'Activate'">
                  <Eye v-if="item.isActive" class="w-4 h-4" /><EyeOff v-else class="w-4 h-4" />
                </button>
                <button @click="confirmDelete(item)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 class="w-4 h-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />

    <BaseModal v-model="showModal" :title="editing ? 'Edit Quotation Type' : 'Add Quotation Type'" size="sm">
      <div class="space-y-4">
        <BaseInput v-model="form.name" label="Quotation Type Name" placeholder="e.g. PR, VG BIG" required />
        <BaseInput v-model="form.templateName" label="Template" placeholder="e.g. Standard Compact (2 Columns)" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">{{ editing ? 'Update' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="showDeleteModal" title="Delete Quotation Type" size="sm">
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
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil, Copy as CopyIcon, Eye, EyeOff, Trash2 } from 'lucide-vue-next'

const toast = useToast()
const items = ref<any[]>([])
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
const form = reactive({ name: '', templateName: '' })

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (v) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { debouncedSearch.value = v; page.value = 1 }, 300) })

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, string> = { page: String(page.value), limit: String(limit.value) }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    const { data } = await api.get('/quotation-types', { params })
    items.value = data.data; total.value = data.total
  } catch {} finally { loading.value = false }
}

function openCreateModal() { editing.value = null; Object.assign(form, { name: '', templateName: '' }); showModal.value = true }
function openEditModal(item: any) { editing.value = item.id; Object.assign(form, { name: item.name, templateName: item.templateName || '' }); showModal.value = true }
function confirmDelete(item: any) { deleteTarget.value = item; showDeleteModal.value = true }

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) { await api.put(`/quotation-types/${editing.value}`, form); toast.success('Updated') }
    else { await api.post('/quotation-types', form); toast.success('Created') }
    showModal.value = false; fetchItems()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') } finally { saving.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return; deleting.value = true
  try { await api.delete(`/quotation-types/${deleteTarget.value.id}`); toast.success('Deleted'); showDeleteModal.value = false; fetchItems() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed') } finally { deleting.value = false }
}

async function handleCopy(item: any) {
  try { await api.post(`/quotation-types/${item.id}/copy`); toast.success('Copied'); fetchItems() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
}

async function toggleActive(item: any) {
  try { await api.put(`/quotation-types/${item.id}`, { isActive: !item.isActive }); toast.success(item.isActive ? 'Deactivated' : 'Activated'); fetchItems() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
}

watch([debouncedSearch, page, limit], () => fetchItems())
onMounted(() => fetchItems())
</script>
