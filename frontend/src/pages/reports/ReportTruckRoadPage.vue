<template>
  <div>
    <div class="mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Truck Map Setting</h2>
    </div>

    <div class="flex flex-wrap items-end gap-3 mb-4">
      <div class="flex-1 min-w-[250px]">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input
          v-model="search"
          type="text"
          placeholder="Search Customer Name / Code / Short Code"
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
          @keyup.enter="fetchData"
        />
      </div>
      <div class="min-w-[200px]">
        <label class="block text-xs text-stone-500 mb-1">Filter by Truck</label>
        <select
          v-model="truckId"
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50"
        >
          <option value="">All Trucks</option>
          <option v-for="t in trucks" :key="t.id" :value="t.id">{{ t.code }} — {{ t.description }}</option>
        </select>
      </div>
      <BaseButton variant="secondary" size="md" disabled>
        <RefreshCw class="w-4 h-4 mr-1.5" /> Refresh Data
      </BaseButton>
      <button
        @click="fetchData"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        :disabled="loading"
      >
        Refresh List
      </button>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3">Customer Code</th>
            <th class="px-4 py-3">Company Name</th>
            <th class="px-4 py-3">Short Code</th>
            <th class="px-4 py-3">State</th>
            <th class="px-4 py-3">City</th>
            <th class="px-4 py-3">Truck</th>
            <th class="px-4 py-3">Level</th>
            <th class="px-4 py-3 w-24 text-center">Action</th>
          </tr>
        </thead>
        <tbody v-if="loading">
          <tr>
            <td colspan="8" class="px-4 py-8 text-center text-stone-400">Loading...</td>
          </tr>
        </tbody>
        <tbody v-else-if="!rows.length">
          <tr>
            <td colspan="8" class="px-4 py-8 text-center text-stone-400">No truck route records found.</td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr v-for="row in rows" :key="row.id" class="border-b border-stone-100 hover:bg-stone-50 transition-colors">
            <td class="px-4 py-3 font-medium text-stone-900">{{ row.customer?.companyCode || '-' }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.customer?.companyName || row.customer?.name || '-' }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.customer?.branchCode || '-' }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.customer?.country || '-' }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.customer?.branchLocation || '-' }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.truck?.code || '-' }}</td>
            <td class="px-4 py-3 text-stone-700">{{ row.level }}</td>
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
      <p class="text-sm text-stone-500">Total Records: {{ rows.length }}</p>
    </div>

    <!-- Edit Modal -->
    <BaseModal v-model="showModal" title="Edit Truck Assignment">
      <form @submit.prevent="saveAssignment" class="space-y-4">
        <div>
          <p class="text-sm text-stone-500 mb-3">
            Editing: <span class="font-medium text-stone-900">{{ editRow?.customer?.companyName || editRow?.customer?.name }}</span>
            <span class="text-stone-400">({{ editRow?.customer?.companyCode }})</span>
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">Truck</label>
          <select
            v-model="editForm.truckId"
            class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
          >
            <option value="" disabled>Select truck...</option>
            <option v-for="t in trucks" :key="t.id" :value="t.id">{{ t.code }} — {{ t.description }}</option>
          </select>
        </div>
        <BaseInput v-model="editForm.level" label="Level" placeholder="Enter level" type="number" />
      </form>
      <template #footer>
        <BaseButton variant="secondary" size="md" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" size="md" :loading="saving" @click="saveAssignment">Save</BaseButton>
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
import { Pencil, RefreshCw } from 'lucide-vue-next'

const toast = useToast()
const search = ref('')
const truckId = ref('')
const trucks = ref<any[]>([])
const rows = ref<any[]>([])
const loading = ref(false)

const showModal = ref(false)
const saving = ref(false)
const editRow = ref<any>(null)
const editForm = ref({ truckId: '', level: '' })

async function fetchTrucks() {
  try {
    const { data } = await api.get('/trucks', { params: { limit: 500 } })
    trucks.value = data.data || []
  } catch {
    toast.error('Failed to load trucks')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/truck-routes', {
      params: {
        search: search.value || undefined,
        truckId: truckId.value || undefined,
      },
    })
    rows.value = data.data || []
  } catch {
    toast.error('Failed to load truck routes')
  } finally {
    loading.value = false
  }
}

function openEdit(row: any) {
  editRow.value = row
  editForm.value = {
    truckId: row.truck?.id || row.truckId || '',
    level: row.level?.toString() || '',
  }
  showModal.value = true
}

async function saveAssignment() {
  if (!editRow.value) return
  saving.value = true
  try {
    await api.put(`/truck-routes/${editRow.value.id}`, {
      truckId: editForm.value.truckId,
      level: Number(editForm.value.level) || 0,
    })
    toast.success('Truck assignment updated')
    showModal.value = false
    fetchData()
  } catch {
    toast.error('Failed to update truck assignment')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchTrucks()
  fetchData()
})
</script>
