<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">User (Office)</h2>
      <BaseButton variant="primary" size="sm" @click="openCreateModal">
        <Plus class="w-4 h-4 mr-1" /> Add New
      </BaseButton>
    </div>

    <!-- Filters -->
    <div class="flex items-end gap-4 mb-6">
      <div class="flex-1 max-w-xs">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input v-model="search" type="text" placeholder="Search by name or username" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
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

    <!-- Table -->
    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-12">No.</th>
            <th class="px-4 py-3 font-medium">Username</th>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Email</th>
            <th class="px-4 py-3 font-medium">Contact Number</th>
            <th class="px-4 py-3 font-medium">User Group</th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading">
            <td colspan="8" class="px-4 py-12 text-center text-stone-500">Loading...</td>
          </tr>
          <tr v-else-if="!users.length">
            <td colspan="8" class="px-4 py-12 text-center text-stone-500">No users found.</td>
          </tr>
          <tr v-else v-for="(user, index) in users" :key="user.id" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + index + 1 }}</td>
            <td class="px-4 py-3 text-stone-700">{{ user.username || '-' }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ user.name }}</td>
            <td class="px-4 py-3">
              <BaseBadge :color="user.isActive ? 'green' : 'red'">
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </BaseBadge>
            </td>
            <td class="px-4 py-3 text-stone-600">{{ user.email || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ user.phone || '-' }}</td>
            <td class="px-4 py-3 text-stone-600">{{ formatUserGroup(user.userGroup) }}</td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="openEditModal(user)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit">
                  <Pencil class="w-4 h-4" />
                </button>
                <button v-if="user.id !== authStore.user?.id" @click="confirmDelete(user)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-1">
        <button
          v-for="size in pageSizes"
          :key="size"
          @click="changePageSize(size)"
          :class="[
            'px-3 py-1.5 text-sm rounded-lg transition-colors',
            limit === size ? 'bg-green-600 text-stone-50 font-medium' : 'text-stone-600 hover:bg-stone-200',
          ]"
        >
          {{ size }}
        </button>
      </div>
      <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />
    </div>

    <!-- Create/Edit Modal -->
    <BaseModal v-model="showModal" :title="editing ? 'Edit User' : 'Add New User'" size="md">
      <div class="space-y-4">
        <BaseInput v-model="form.username" label="Username" placeholder="Username" />
        <BaseInput v-model="form.name" label="Name" placeholder="Full name" required />
        <BaseInput v-model="form.email" label="Email" type="email" placeholder="email@example.com" required />
        <BaseInput v-if="!editing" v-model="form.password" label="Password" type="password" placeholder="Min 6 characters" required />
        <BaseInput v-model="form.phone" label="Contact Number" placeholder="+60 12-345 6789" />
        <BaseSelect v-model="form.userGroup" label="User Group" required>
          <option value="">— Select —</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="BOSS">Boss</option>
          <option value="ADMIN">Admin</option>
          <option value="INVENTORY_MANAGER">Inventory Manager</option>
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

    <!-- Delete Confirmation Modal -->
    <BaseModal v-model="showDeleteModal" title="Delete User" size="sm">
      <p class="text-stone-600 text-sm">Are you sure you want to delete <strong class="text-stone-900">{{ deleteTarget?.name }}</strong>? This will deactivate the user account.</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="deleting" @click="handleDelete" class="!bg-red-500 hover:!bg-red-600">Delete</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import { useAuthStore } from '../../stores/auth'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import type { User, UserGroup } from '../../types'

const toast = useToast()
const authStore = useAuthStore()

const users = ref<User[]>([])
const loading = ref(true)
const search = ref('')
const filterStatus = ref('')
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const pageSizes = [10, 25, 50, 100]

const saving = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const editing = ref<string | null>(null)
const deleteTarget = ref<User | null>(null)

const form = reactive({
  username: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  userGroup: '' as string,
  isActive: true,
})

const USER_GROUP_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  BOSS: 'Boss',
  ADMIN: 'Admin',
  INVENTORY_MANAGER: 'Inventory Manager',
}

function formatUserGroup(group?: UserGroup | null): string {
  if (!group) return '-'
  return USER_GROUP_LABELS[group] || group
}

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = ref('')
watch(search, (val) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = val
    page.value = 1
  }, 300)
})

watch(filterStatus, () => { page.value = 1 })

function changePageSize(size: number) {
  limit.value = size
  page.value = 1
}

async function fetchUsers() {
  loading.value = true
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      limit: String(limit.value),
    }
    if (debouncedSearch.value) params.search = debouncedSearch.value
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/staff', { params })
    users.value = data.data
    total.value = data.total
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editing.value = null
  form.username = ''
  form.name = ''
  form.email = ''
  form.password = ''
  form.phone = ''
  form.userGroup = ''
  form.isActive = true
  showModal.value = true
}

function openEditModal(u: User) {
  editing.value = u.id
  form.username = u.username || ''
  form.name = u.name
  form.email = u.email
  form.phone = u.phone || ''
  form.userGroup = u.userGroup || ''
  form.isActive = u.isActive ?? true
  showModal.value = true
}

function confirmDelete(u: User) {
  deleteTarget.value = u
  showDeleteModal.value = true
}

async function handleSave() {
  saving.value = true
  try {
    if (editing.value) {
      await api.put(`/staff/${editing.value}`, {
        username: form.username || null,
        name: form.name,
        email: form.email,
        phone: form.phone,
        userGroup: form.userGroup || null,
        isActive: form.isActive,
      })
      toast.success('User updated')
    } else {
      await api.post('/staff', {
        username: form.username || null,
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        userGroup: form.userGroup || null,
        role: 'ADMIN',
      })
      toast.success('User created')
    }
    showModal.value = false
    fetchUsers()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await api.delete(`/staff/${deleteTarget.value.id}`)
    toast.success('User deleted')
    showDeleteModal.value = false
    fetchUsers()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to delete')
  } finally {
    deleting.value = false
  }
}

watch([debouncedSearch, filterStatus, page, limit], () => fetchUsers())
onMounted(() => fetchUsers())
</script>
