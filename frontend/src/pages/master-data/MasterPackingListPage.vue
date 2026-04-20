<template>
  <div>
    <!-- Tabs -->
    <div class="flex border-b border-stone-200 mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="activeTab = tab.value"
        class="flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors"
        :class="activeTab === tab.value ? 'border-green-600 text-green-600' : 'border-transparent text-stone-500 hover:text-stone-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Packing Templates Tab -->
    <div v-if="activeTab === 'templates'">
      <div class="flex items-end gap-4 mb-6">
        <div class="flex-1 max-w-sm">
          <input v-model="search" type="text" placeholder="Search Templates..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 mb-4">
        <BaseButton variant="secondary" size="sm" disabled><FileText class="w-4 h-4 mr-1" /> Template</BaseButton>
        <BaseButton variant="secondary" size="sm" disabled><Upload class="w-4 h-4 mr-1" /> Import</BaseButton>
        <BaseButton variant="primary" size="sm" @click="openCreateModal"><Plus class="w-4 h-4 mr-1" /> Add New</BaseButton>
      </div>

      <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
        <table class="w-full text-sm text-left">
          <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
            <tr>
              <th class="px-4 py-3 font-medium w-16">No</th>
              <th class="px-4 py-3 font-medium">Packing List Name</th>
              <th class="px-4 py-3 font-medium">Template</th>
              <th class="px-4 py-3 font-medium text-center">Status</th>
              <th class="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-200">
            <tr v-if="loading"><td colspan="5" class="px-4 py-12 text-center text-stone-500">Loading...</td></tr>
            <tr v-else-if="!items.length"><td colspan="5" class="px-4 py-12 text-center text-stone-500">No packing list templates found.</td></tr>
            <tr v-else v-for="(item, idx) in items" :key="item.id" class="hover:bg-stone-200/30 transition-colors">
              <td class="px-4 py-3 text-stone-500">{{ idx + 1 }}</td>
              <td class="px-4 py-3 text-stone-900 font-semibold">{{ item.name }}</td>
              <td class="px-4 py-3 text-stone-600">{{ item.templateName || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <BaseBadge :color="item.isActive ? 'green' : 'red'">{{ item.isActive ? 'Active' : 'Inactive' }}</BaseBadge>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <button @click="openEditModal(item)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit"><Pencil class="w-4 h-4" /></button>
                  <button @click="toast.success('Save — coming soon')" class="p-1.5 text-stone-500 hover:text-green-500 transition-colors" title="Save"><Save class="w-4 h-4" /></button>
                  <button @click="confirmDelete(item)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 class="w-4 h-4" /></button>
                  <button @click="toast.success('Print — coming soon')" class="p-1.5 text-stone-500 hover:text-stone-700 transition-colors" title="Print"><Printer class="w-4 h-4" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Branch Connections Tab -->
    <div v-else>
      <div class="bg-white border border-stone-200 rounded-xl p-12 text-center">
        <Construction class="w-12 h-12 text-stone-400 mx-auto mb-3" />
        <p class="text-stone-500">Branch Connections configuration is under development.</p>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal v-model="showModal" :title="editing ? 'Edit Packing List' : 'Add Packing List'" size="sm">
      <div class="space-y-4">
        <BaseInput v-model="form.name" label="Packing List Name" placeholder="e.g. VG BIG, JUSCO" required />
        <BaseInput v-model="form.templateName" label="Template" placeholder="e.g. Normal, TFP" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">{{ editing ? 'Update' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <BaseModal v-model="showDeleteModal" title="Delete Packing List" size="sm">
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
import { Plus, Pencil, Save, Trash2, Printer, Upload, FileText, Construction } from 'lucide-vue-next'

const toast = useToast()
const tabs = [
  { label: 'Packing Templates', value: 'templates' },
  { label: 'Branch Connections', value: 'connections' },
]
const activeTab = ref('templates')

const items = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const saving = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editing = ref<string | null>(null)
const deleteTarget = ref<any>(null)
const form = reactive({ name: '', templateName: '' })

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (v) => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { debouncedSearch.value = v }, 300) })

async function fetchItems() {
  loading.value = true
  try {
    const params: Record<string, string> = { limit: '100' }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    const { data } = await api.get('/packing-list-templates', { params })
    items.value = data.data
  } catch {} finally { loading.value = false }
}

function openCreateModal() { editing.value = null; Object.assign(form, { name: '', templateName: '' }); showModal.value = true }
function openEditModal(item: any) { editing.value = item.id; Object.assign(form, { name: item.name, templateName: item.templateName || '' }); showModal.value = true }
function confirmDelete(item: any) { deleteTarget.value = item; showDeleteModal.value = true }

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) { await api.put(`/packing-list-templates/${editing.value}`, form); toast.success('Updated') }
    else { await api.post('/packing-list-templates', form); toast.success('Created') }
    showModal.value = false; fetchItems()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') } finally { saving.value = false }
}

async function handleDelete() {
  if (!deleteTarget.value) return; deleting.value = true
  try { await api.delete(`/packing-list-templates/${deleteTarget.value.id}`); toast.success('Deleted'); showDeleteModal.value = false; fetchItems() }
  catch (e: any) { toast.error(e.response?.data?.message || 'Failed') } finally { deleting.value = false }
}

watch([debouncedSearch], () => fetchItems())
onMounted(() => fetchItems())
</script>
