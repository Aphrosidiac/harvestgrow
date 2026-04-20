<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Trucks</h2>
      <div class="flex items-center gap-2">
        <BaseButton variant="primary" size="md" @click="openAdd">
          <Plus class="w-4 h-4 mr-1.5" /> Add Truck
        </BaseButton>
      </div>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div class="flex-1 min-w-[250px]">
        <input
          v-model="search"
          type="text"
          placeholder="Truck Code / Description"
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
          @keyup.enter="fetchData"
        />
      </div>
      <BaseButton variant="secondary" size="md" disabled>
        <Download class="w-4 h-4 mr-1.5" /> Export
      </BaseButton>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 w-16">No</th>
            <th class="px-4 py-3">Truck Code</th>
            <th class="px-4 py-3">Description</th>
            <th class="px-4 py-3 w-24 text-center">Action</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr>
            <td colspan="4" class="px-4 py-8 text-center text-stone-400">Loading...</td>
          </tr>
        </tbody>
        <tbody v-else-if="!rows.length">
          <tr>
            <td colspan="4" class="px-4 py-8 text-center text-stone-400">No trucks found.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="(row, i) in rows" :key="row.id" class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + i + 1 }}</td>
            <td class="px-4 py-3 font-medium text-stone-900">{{ row.code }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.description }}</td>
            <td class="px-4 py-3 text-center">
              <button @click="openEdit(row)" class="text-stone-400 hover:text-green-600 transition-colors">
                <Pencil class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-2">
        <span class="text-sm text-stone-500">Rows per page:</span>
        <select v-model.number="limit" @change="page = 1; fetchData()" class="bg-stone-200 border border-stone-300 rounded-lg px-2 py-1 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>
      <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event; fetchData()" />
    </div>

    <!-- Add / Edit Modal -->
    <BaseModal v-model="showModal" :title="editingId ? 'Edit Truck' : 'Add Truck'">
      <form @submit.prevent="save" class="space-y-4">
        <BaseInput v-model="form.code" label="Truck Code" placeholder="Enter truck code" required />
        <BaseInput v-model="form.description" label="Description" placeholder="Enter description" />
      </form>
      <template #footer>
        <BaseButton variant="secondary" size="md" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" size="md" :loading="saving" @click="save">
          {{ editingId ? 'Update' : 'Create' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil, Download } from 'lucide-vue-next'

const toast = useToast()
const search = ref('')
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const rows = ref<any[]>([])
const loading = ref(false)

const showModal = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ code: '', description: '' })

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/trucks', {
      params: { search: search.value || undefined, page: page.value, limit: limit.value },
    })
    rows.value = data.data || []
    total.value = data.total || 0
  } catch {
    toast.error('Failed to load trucks')
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editingId.value = null
  form.value = { code: '', description: '' }
  showModal.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  form.value = { code: row.code, description: row.description || '' }
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editingId.value) {
      await api.put(`/trucks/${editingId.value}`, form.value)
      toast.success('Truck updated')
    } else {
      await api.post('/trucks', form.value)
      toast.success('Truck created')
    }
    showModal.value = false
    fetchData()
  } catch {
    toast.error('Failed to save truck')
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>
