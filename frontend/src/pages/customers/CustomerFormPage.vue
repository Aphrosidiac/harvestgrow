<template>
  <div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-stone-500 hover:text-stone-700 transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold text-stone-900">{{ isEdit ? 'Edit Customer' : 'New Customer' }}</h2>
    </div>

    <div v-if="pageLoading" class="text-stone-500">Loading...</div>

    <template v-else>
      <!-- Customer Info -->
      <form @submit.prevent="handleSave" class="bg-white border border-stone-200 rounded-xl p-6 space-y-4 mb-6">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Customer Info</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          <BaseInput v-model="form.phone" label="Phone" placeholder="+60 12-345 6789" required />
          <BaseInput v-model="form.name" label="Name (optional)" placeholder="Customer name" />
          <BaseInput v-model="form.companyName" label="Company Name (optional)" placeholder="Company name" class="sm:col-span-2" />
          <BaseInput v-model="form.email" label="Email (optional)" type="email" placeholder="customer@email.com" class="sm:col-span-2" />
        </div>
        <div class="flex justify-end">
          <BaseButton variant="primary" type="submit" :loading="saving">
            {{ isEdit ? 'Update Customer' : 'Create Customer' }}
          </BaseButton>
        </div>
      </form>

      <!-- Vehicles (only show in edit mode) -->
      <div v-if="isEdit" class="bg-white border border-stone-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Vehicles</h3>
          <BaseButton variant="secondary" size="sm" @click="showVehicleModal = true">
            <Plus class="w-4 h-4 mr-1" /> Add Vehicle
          </BaseButton>
        </div>

        <div v-if="!vehicles.length" class="text-stone-500 text-sm text-center py-8">No vehicles added yet.</div>

        <div v-else class="space-y-3">
          <div v-for="v in vehicles" :key="v.id" class="flex items-center justify-between bg-stone-200/50 border border-stone-300 rounded-lg px-4 py-3">
            <div class="flex items-center gap-3">
              <div>
                <span class="font-mono text-green-600 text-sm font-medium">{{ v.plate }}</span>
                <BaseBadge v-if="v.isDefault" color="gold" class="ml-2">Default</BaseBadge>
                <p v-if="v.make || v.model" class="text-stone-500 text-xs mt-0.5">{{ [v.make, v.model].filter(Boolean).join(' ') }}</p>
                <div class="flex gap-3 text-stone-500 text-xs">
                  <span v-if="v.color">{{ v.color }}</span>
                  <span v-if="v.mileage">{{ v.mileage }} KM</span>
                  <span v-if="v.engineNo">Eng: {{ v.engineNo }}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button v-if="!v.isDefault" @click="setDefault(v.id)" class="p-1.5 text-stone-500 hover:text-green-600 transition-colors" title="Set as default">
                <Star class="w-4 h-4" />
              </button>
              <button @click="editVehicle(v)" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors">
                <Pencil class="w-4 h-4" />
              </button>
              <button @click="handleDeleteVehicle(v.id)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Vehicle Modal -->
      <BaseModal v-model="showVehicleModal" :title="editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'" size="sm">
        <div class="space-y-4">
          <BaseInput v-model="vehicleForm.plate" label="Plate Number" placeholder="e.g. JUX 1589" required />
          <div class="grid grid-cols-2 gap-4">
            <BaseInput v-model="vehicleForm.make" label="Make" placeholder="e.g. Honda, BMW" />
            <BaseInput v-model="vehicleForm.model" label="Model" placeholder="e.g. Accord T2A, 320i" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <BaseInput v-model="vehicleForm.color" label="Color" placeholder="e.g. White" />
            <BaseInput v-model="vehicleForm.mileage" label="Mileage (KM)" placeholder="e.g. 57028" />
          </div>
          <BaseInput v-model="vehicleForm.engineNo" label="Engine No" placeholder="e.g. R20A3-123456" />
        </div>
        <template #footer>
          <BaseButton variant="secondary" @click="closeVehicleModal">Cancel</BaseButton>
          <BaseButton variant="primary" @click="handleSaveVehicle" :loading="savingVehicle" :disabled="!vehicleForm.plate">
            {{ editingVehicle ? 'Update' : 'Add' }}
          </BaseButton>
        </template>
      </BaseModal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '../../stores/customers'
import { useToast } from '../../composables/useToast'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import { ArrowLeft, Plus, Pencil, Trash2, Star } from 'lucide-vue-next'
import type { Vehicle } from '../../types'

const route = useRoute()
const router = useRouter()
const store = useCustomerStore()
const toast = useToast()

const isEdit = computed(() => !!route.params.id)
const pageLoading = ref(false)
const saving = ref(false)
const savingVehicle = ref(false)
const showVehicleModal = ref(false)
const editingVehicle = ref<string | null>(null)
const vehicles = ref<Vehicle[]>([])

const form = reactive({ name: '', companyName: '', phone: '', email: '' })
const vehicleForm = reactive({ plate: '', make: '', model: '', color: '', mileage: '', engineNo: '' })

async function loadCustomer() {
  if (!route.params.id) return
  pageLoading.value = true
  try {
    const customer = await store.getCustomer(route.params.id as string)
    form.name = customer.name
    form.companyName = customer.companyName || ''
    form.phone = customer.phone || ''
    form.email = customer.email || ''
    vehicles.value = customer.vehicles || []
  } catch {
    toast.error('Failed to load customer')
    router.push('/app/customers')
  } finally {
    pageLoading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    if (isEdit.value) {
      await store.updateCustomer(route.params.id as string, form)
      toast.success('Customer updated')
    } else {
      const customer = await store.createCustomer(form)
      toast.success('Customer created')
      router.push(`/app/customers/${customer.id}/edit`)
      return
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

function editVehicle(v: Vehicle) {
  editingVehicle.value = v.id
  vehicleForm.plate = v.plate
  vehicleForm.make = v.make || ''
  vehicleForm.model = v.model || ''
  vehicleForm.color = v.color || ''
  vehicleForm.mileage = v.mileage || ''
  vehicleForm.engineNo = v.engineNo || ''
  showVehicleModal.value = true
}

function closeVehicleModal() {
  showVehicleModal.value = false
  editingVehicle.value = null
  vehicleForm.plate = ''
  vehicleForm.make = ''
  vehicleForm.model = ''
  vehicleForm.color = ''
  vehicleForm.mileage = ''
  vehicleForm.engineNo = ''
}

async function handleSaveVehicle() {
  if (!route.params.id) return
  savingVehicle.value = true
  try {
    if (editingVehicle.value) {
      await store.updateVehicle(route.params.id as string, editingVehicle.value, vehicleForm)
      toast.success('Vehicle updated')
    } else {
      await store.addVehicle(route.params.id as string, vehicleForm)
      toast.success('Vehicle added')
    }
    closeVehicleModal()
    loadCustomer()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save vehicle')
  } finally {
    savingVehicle.value = false
  }
}

async function setDefault(vehicleId: string) {
  try {
    await store.updateVehicle(route.params.id as string, vehicleId, { isDefault: true })
    loadCustomer()
    toast.success('Default vehicle updated')
  } catch {
    toast.error('Failed to update')
  }
}

async function handleDeleteVehicle(vehicleId: string) {
  if (!confirm('Delete this vehicle?')) return
  try {
    await store.deleteVehicle(route.params.id as string, vehicleId)
    loadCustomer()
    toast.success('Vehicle deleted')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to delete')
  }
}

onMounted(() => loadCustomer())
</script>
