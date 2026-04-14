<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Drivers</h2>
      <button @click="openCreate" class="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1">
        <Plus class="w-4 h-4" /> Add Driver
      </button>
    </div>

    <p class="text-xs text-stone-500 mb-4">
      Drivers are created from existing staff with the DRIVER role.
      To promote staff: go to <RouterLink to="/app/staff" class="underline text-green-700">Staff Management</RouterLink> and change their role to DRIVER first.
    </p>

    <div class="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-stone-50 text-stone-600">
          <tr>
            <th class="text-left px-3 py-2">Name</th>
            <th class="text-left px-3 py-2">Email</th>
            <th class="text-left px-3 py-2">Phone</th>
            <th class="text-left px-3 py-2">Vehicle Plate</th>
            <th class="text-left px-3 py-2">Active</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in store.drivers" :key="d.id" class="border-t border-stone-100">
            <td class="px-3 py-2 font-medium text-stone-900">{{ d.user?.name }}</td>
            <td class="px-3 py-2 text-stone-600">{{ d.user?.email }}</td>
            <td class="px-3 py-2">
              <input v-model="editPhone[d.id]" @blur="savePhone(d)" class="rounded border border-stone-200 px-2 py-1 text-sm w-full" />
            </td>
            <td class="px-3 py-2">
              <input v-model="editPlate[d.id]" @blur="savePlate(d)" class="rounded border border-stone-200 px-2 py-1 text-sm w-full" />
            </td>
            <td class="px-3 py-2">
              <label class="inline-flex items-center gap-2">
                <input type="checkbox" :checked="d.active" @change="toggleActive(d)" />
                <span class="text-xs text-stone-500">{{ d.active ? 'Active' : 'Inactive' }}</span>
              </label>
            </td>
          </tr>
          <tr v-if="!store.drivers.length">
            <td colspan="5" class="px-3 py-6 text-center text-stone-400">No drivers configured yet.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="showCreate = false" />
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md p-5">
        <h3 class="text-lg font-semibold mb-3">Add Driver</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Staff (role DRIVER)</label>
            <select v-model="form.userId" class="w-full rounded-lg border border-stone-300 px-3 py-2">
              <option value="">Select...</option>
              <option v-for="u in driverUsers" :key="u.id" :value="u.id">{{ u.name }} ({{ u.email }})</option>
            </select>
            <p v-if="!driverUsers.length" class="text-xs text-red-600 mt-1">
              No staff with DRIVER role. Promote someone from Staff Management first.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Vehicle Plate</label>
            <input v-model="form.vehiclePlate" class="w-full rounded-lg border border-stone-300 px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Phone</label>
            <input v-model="form.phone" class="w-full rounded-lg border border-stone-300 px-3 py-2" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button @click="showCreate = false" class="px-3 py-2 text-sm text-stone-600">Cancel</button>
            <button @click="save" :disabled="!form.userId" class="bg-green-600 disabled:bg-green-300 text-white rounded-lg px-4 py-2 text-sm">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { useDeliveryStore } from '../../stores/delivery'
import api from '../../lib/api'
import type { User, Driver } from '../../types'

const store = useDeliveryStore()
const showCreate = ref(false)
const driverUsers = ref<User[]>([])
const form = reactive({ userId: '', vehiclePlate: '', phone: '' })

const editPhone = reactive<Record<string, string>>({})
const editPlate = reactive<Record<string, string>>({})

async function load() {
  await store.fetchDrivers()
  for (const d of store.drivers) {
    editPhone[d.id] = d.phone || ''
    editPlate[d.id] = d.vehiclePlate || ''
  }
}

async function openCreate() {
  try {
    const { data } = await api.get('/staff', { params: { limit: '100' } })
    driverUsers.value = (data.data as User[]).filter((u) => u.role === 'DRIVER')
  } catch {
    driverUsers.value = []
  }
  // Exclude users that already have a driver profile
  const existingIds = new Set(store.drivers.map((d) => d.userId))
  driverUsers.value = driverUsers.value.filter((u) => !existingIds.has(u.id))
  form.userId = ''
  form.vehiclePlate = ''
  form.phone = ''
  showCreate.value = true
}

async function save() {
  try {
    await store.createDriver({ userId: form.userId, vehiclePlate: form.vehiclePlate || undefined, phone: form.phone || undefined })
    showCreate.value = false
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Failed to create driver')
  }
}

async function savePhone(d: Driver) {
  const v = editPhone[d.id] ?? ''
  if (v === (d.phone || '')) return
  await store.updateDriver(d.id, { phone: v })
  await load()
}

async function savePlate(d: Driver) {
  const v = editPlate[d.id] ?? ''
  if (v === (d.vehiclePlate || '')) return
  await store.updateDriver(d.id, { vehiclePlate: v })
  await load()
}

async function toggleActive(d: Driver) {
  await store.updateDriver(d.id, { active: !d.active })
  await load()
}

watch(() => store.drivers, () => { /* keep editPhone/editPlate in sync */ })
onMounted(load)
</script>
