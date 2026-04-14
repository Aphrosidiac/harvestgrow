<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Staff Management</h2>
      <BaseButton variant="primary" size="sm" @click="openCreateModal">
        <Plus class="w-4 h-4 mr-1" /> Add Staff
      </BaseButton>
    </div>

    <!-- Filters -->
    <div class="flex items-end gap-4 mb-6">
      <div class="flex-1 max-w-xs">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input v-model="search" type="text" placeholder="Name, email, phone..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">Role</label>
        <select v-model="filterRole" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="WORKER">Worker</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <BaseTable :columns="columns" :data="staff" :loading="loading" empty-text="No staff found.">
      <template #cell-name="{ row }">
        <div>
          <span class="text-stone-900 font-medium">{{ row.name }}</span>
          <span v-if="!row.isActive" class="ml-2 text-xs text-red-400">(Inactive)</span>
        </div>
      </template>
      <template #cell-email="{ value }">
        <span class="text-stone-600 text-sm">{{ value }}</span>
      </template>
      <template #cell-phone="{ value }">
        <span class="text-stone-500 text-sm">{{ value || '-' }}</span>
      </template>
      <template #cell-jobTitle="{ value }">
        <span v-if="value" class="text-stone-600 text-sm">{{ value }}</span>
        <span v-else class="text-stone-500 text-sm">-</span>
      </template>
      <template #cell-role="{ value }">
        <BaseBadge :color="value === 'ADMIN' ? 'red' : value === 'MANAGER' ? 'blue' : 'gold'">
          {{ value }}
        </BaseBadge>
      </template>
      <template #cell-orders="{ row }">
        <span class="text-stone-500 text-sm">{{ row._count?.foremanDocuments || 0 }}</span>
      </template>
      <template #actions="{ row }">
        <div class="flex items-center gap-1">
          <button @click="openEditModal(row as User)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors">
            <Pencil class="w-4 h-4" />
          </button>
          <button @click="openResetModal(row as User)" class="p-1.5 text-stone-500 hover:text-yellow-400 transition-colors" title="Reset Password">
            <KeyRound class="w-4 h-4" />
          </button>
        </div>
      </template>
    </BaseTable>

    <!-- Create/Edit Modal -->
    <BaseModal v-model="showModal" :title="editing ? 'Edit Staff' : 'Add Staff'" size="md">
      <div class="space-y-4">
        <BaseInput v-model="form.name" label="Name" placeholder="Full name" required />
        <BaseInput v-model="form.email" label="Email" type="email" placeholder="email@example.com" required />
        <BaseInput v-if="!editing" v-model="form.password" label="Password" type="password" placeholder="Min 6 characters" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="form.phone" label="Phone" placeholder="+60 12-345 6789" />
          <BaseInput v-model="form.jobTitle" label="Job Title" placeholder="e.g. Foreman, Mechanic" />
        </div>
        <BaseSelect v-model="form.role" label="System Role" required>
          <option value="WORKER">Worker</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </BaseSelect>
        <div v-if="editing" class="flex items-center gap-2">
          <input type="checkbox" v-model="form.isActive" id="active-toggle" class="accent-green-600" />
          <label for="active-toggle" class="text-stone-600 text-sm">Active (can login)</label>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleSave">
          {{ editing ? 'Update' : 'Create' }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Reset Password Modal -->
    <BaseModal v-model="showResetModal" title="Reset Password" size="sm">
      <p class="text-stone-600 text-sm mb-4">Set a new password for <strong class="text-stone-900">{{ resetTarget?.name }}</strong></p>
      <BaseInput v-model="newPassword" label="New Password" type="password" placeholder="Min 6 characters" required />
      <template #footer>
        <BaseButton variant="secondary" @click="showResetModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="resetting" @click="handleResetPassword">Reset Password</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseTable from '../../components/base/BaseTable.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import { Plus, Pencil, KeyRound } from 'lucide-vue-next'
import type { User } from '../../types'

const toast = useToast()

const staff = ref<User[]>([])
const loading = ref(true)
const search = ref('')
const filterRole = ref('')
const saving = ref(false)
const resetting = ref(false)
const showModal = ref(false)
const showResetModal = ref(false)
const editing = ref<string | null>(null)
const resetTarget = ref<User | null>(null)
const newPassword = ref('')

const form = reactive({
  name: '',
  email: '',
  password: '',
  phone: '',
  jobTitle: '',
  role: 'WORKER',
  isActive: true,
})

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'jobTitle', label: 'Job Title' },
  { key: 'role', label: 'Role' },
  { key: 'orders', label: 'Orders' },
]

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { debouncedSearch.value = val }, 300)
})

async function fetchStaff() {
  loading.value = true
  try {
    const params: Record<string, string> = { limit: '100' }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    if (filterRole.value) params.role = filterRole.value
    const { data } = await api.get('/staff', { params })
    staff.value = data.data
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editing.value = null
  form.name = ''
  form.email = ''
  form.password = ''
  form.phone = ''
  form.jobTitle = ''
  form.role = 'WORKER'
  form.isActive = true
  showModal.value = true
}

function openEditModal(s: User) {
  editing.value = s.id
  form.name = s.name
  form.email = s.email
  form.phone = s.phone || ''
  form.jobTitle = s.jobTitle || ''
  form.role = s.role
  form.isActive = s.isActive ?? true
  showModal.value = true
}

function openResetModal(s: User) {
  resetTarget.value = s
  newPassword.value = ''
  showResetModal.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/staff/${editing.value}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        jobTitle: form.jobTitle,
        role: form.role,
        isActive: form.isActive,
      })
      toast.success('Staff updated')
    } else {
      await api.post('/staff', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        jobTitle: form.jobTitle,
        role: form.role,
      })
      toast.success('Staff created')
    }
    showModal.value = false
    fetchStaff()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function handleResetPassword() {
  if (!resetTarget.value) return
  resetting.value = true
  try {
    await api.post(`/staff/${resetTarget.value.id}/reset-password`, {
      password: newPassword.value,
    })
    toast.success('Password reset successfully')
    showResetModal.value = false
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to reset password')
  } finally {
    resetting.value = false
  }
}

watch([debouncedSearch, filterRole], () => fetchStaff())
onMounted(() => fetchStaff())
</script>
