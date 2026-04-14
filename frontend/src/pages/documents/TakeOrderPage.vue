<template>
  <div class="max-w-4xl">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Take Order</h2>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Customer & Vehicle -->
      <div class="bg-white border border-stone-200 rounded-xl p-6">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Customer & Vehicle</h3>
        <div class="space-y-4">
          <!-- Customer Search -->
          <div class="relative">
            <label class="block text-sm text-stone-600 mb-1">Search Customer</label>
            <input
              v-model="customerSearch"
              @input="debouncedSearch"
              type="text"
              placeholder="Search by phone, plate number, name, or vehicle model..."
              class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50"
            />
            <!-- Selected customer indicator -->
            <div v-if="selectedCustomer" class="mt-2 flex items-center gap-2">
              <span class="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded">Existing customer: {{ selectedCustomer.name }}</span>
              <button type="button" @click="clearCustomer" class="text-stone-500 hover:text-red-400 text-xs">(clear)</button>
            </div>
            <!-- Search Results Dropdown -->
            <div v-if="searchResults.length && showResults" class="absolute z-20 w-full mt-1 bg-stone-200 border border-stone-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              <button
                v-for="c in searchResults"
                :key="c.id"
                type="button"
                @click="selectCustomer(c)"
                class="w-full px-4 py-3 text-left hover:bg-stone-300 transition-colors border-b border-stone-300 last:border-0"
              >
                <div class="flex justify-between">
                  <span class="text-stone-900 text-sm font-medium">{{ c.name }}</span>
                  <span v-if="c.phone" class="text-stone-500 text-xs">{{ c.phone }}</span>
                </div>
                <div v-if="c.vehicles?.length" class="flex gap-2 mt-1">
                  <span v-for="v in c.vehicles" :key="v.id" class="text-green-600 text-xs bg-green-600/10 px-2 py-0.5 rounded">
                    {{ v.plate }} <span v-if="v.make || v.model" class="text-stone-500">({{ [v.make, v.model].filter(Boolean).join(' ') }})</span>
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <BaseInput v-model="form.customerPhone" label="Phone" placeholder="e.g. 012-3456789" />
            <BaseInput v-model="form.customerName" label="Name (optional)" placeholder="Customer name" />
            <BaseSelect v-model="form.foremanId" label="Foreman / Salesperson" placeholder="Select staff">
              <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}{{ w.jobTitle ? ` (${w.jobTitle})` : '' }}</option>
            </BaseSelect>
          </div>

          <!-- Vehicle Switcher (when customer has multiple vehicles) -->
          <div v-if="selectedCustomer && selectedCustomer.vehicles && selectedCustomer.vehicles.length > 1" class="mt-2">
            <label class="block text-sm text-stone-600 mb-1">Select Vehicle</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="v in selectedCustomer.vehicles"
                :key="v.id"
                type="button"
                @click="selectVehicle(v)"
                :class="[
                  'px-3 py-2 rounded-lg text-sm border transition-colors',
                  selectedVehicleId === v.id
                    ? 'bg-green-600/10 border-green-600/40 text-green-600'
                    : 'bg-stone-200 border-stone-300 text-stone-600 hover:border-stone-400',
                ]"
              >
                <span class="font-mono font-medium">{{ v.plate }}</span>
                <span v-if="v.make || v.model" class="text-xs ml-1.5 opacity-70">{{ [v.make, v.model].filter(Boolean).join(' ') }}</span>
              </button>
            </div>
          </div>

          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mt-6 mb-3">Vehicle Info</h3>
          <div class="grid grid-cols-3 gap-4">
            <BaseInput v-model="form.vehiclePlate" label="Plate Number" placeholder="e.g. JQR 1234" />
            <BaseInput v-model="form.vehicleMake" label="Make" placeholder="e.g. Honda, BMW" />
            <BaseInput v-model="form.vehicleModel" label="Model" placeholder="e.g. Accord T2A, 320i" />
          </div>
          <div class="grid grid-cols-3 gap-4">
            <BaseInput v-model="form.vehicleColor" label="Color" placeholder="e.g. White, Black" />
            <BaseInput v-model="form.vehicleMileage" label="Current Mileage (KM)" placeholder="e.g. 112692" />
            <BaseInput v-model="form.vehicleEngineNo" label="Engine No (optional)" placeholder="e.g. R20A3-123456" />
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="bg-white border border-stone-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Items</h3>
          <div class="flex gap-2">
            <BaseButton variant="secondary" size="sm" type="button" @click="addCustomItem">
              <Plus class="w-4 h-4 mr-1" /> Custom Item
            </BaseButton>
            <BaseButton variant="secondary" size="sm" type="button" @click="addItem">
              <Plus class="w-4 h-4 mr-1" /> Add Item
            </BaseButton>
          </div>
        </div>

        <div class="space-y-3">
          <div v-for="(item, idx) in form.items" :key="idx" class="bg-stone-200/50 rounded-lg p-3">
            <div class="flex items-start gap-3">
              <div class="flex-1 grid grid-cols-12 gap-2">
                <!-- Stock search or custom description -->
                <div class="col-span-5 relative">
                  <template v-if="item.isCustom">
                    <textarea
                      v-model="item.description"
                      @input="autoResize"
                      rows="1"
                      placeholder="Enter custom description..."
                      class="w-full bg-stone-200 border border-stone-300 rounded px-2 py-1.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-green-600/50 resize-none overflow-hidden"
                      style="max-height: 120px;"
                    />
                  </template>
                  <template v-else>
                    <input
                      v-model="item.searchTerm"
                      @input="(e) => searchStock(idx, (e.target as HTMLInputElement).value)"
                      @focus="item.showDropdown = true"
                      type="text"
                      placeholder="Search stock item..."
                      class="w-full bg-stone-200 border border-stone-300 rounded px-2 py-1.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-green-600/50"
                    />
                    <div v-if="item.showDropdown && item.stockResults.length" class="absolute z-10 w-full mt-1 bg-stone-200 border border-stone-300 rounded shadow-lg max-h-40 overflow-y-auto">
                      <button
                        v-for="s in item.stockResults"
                        :key="s.id"
                        type="button"
                        @click="selectStock(idx, s)"
                        class="w-full px-3 py-2 text-left hover:bg-stone-300 text-sm transition-colors"
                      >
                        <span class="text-green-600 font-mono text-xs">{{ s.itemCode }}</span>
                        <span class="text-stone-700 ml-2">{{ s.description }}</span>
                        <span class="text-stone-500 ml-2">RM{{ Number(s.sellPrice).toFixed(2) }}</span>
                      </button>
                    </div>
                  </template>
                </div>
                <div v-if="!item.isCustom" class="col-span-2">
                  <textarea
                    v-model="item.description"
                    @input="autoResize"
                    rows="1"
                    placeholder="Description"
                    class="w-full bg-stone-200 border border-stone-300 rounded px-2 py-1.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none resize-none overflow-hidden"
                    style="max-height: 120px;"
                  />
                </div>
                <div :class="item.isCustom ? 'col-span-2' : 'col-span-1'">
                  <input v-model.number="item.quantity" type="number" min="1" placeholder="Qty" class="w-full bg-stone-200 border border-stone-300 rounded px-2 py-1.5 text-stone-900 text-sm text-center focus:outline-none" />
                </div>
                <div class="col-span-2">
                  <input v-model.number="item.unitPrice" type="number" step="0.01" min="0" placeholder="Price" class="w-full bg-stone-200 border border-stone-300 rounded px-2 py-1.5 text-stone-900 text-sm text-right focus:outline-none" />
                </div>
                <div class="col-span-1 text-right text-stone-600 text-sm py-1.5">
                  RM {{ ((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2) }}
                </div>
                <div class="col-span-1 flex justify-end">
                  <button type="button" @click="removeItem(idx)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <!-- Service Date row -->
            <div class="mt-2 flex items-center gap-2 pl-1">
              <label class="text-stone-500 text-xs">Service Date:</label>
              <input
                v-model="item.serviceDate"
                type="date"
                class="bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-xs focus:outline-none focus:ring-1 focus:ring-green-600/50"
              />
            </div>
          </div>
        </div>

        <div class="flex justify-end mt-4 pt-4 border-t border-stone-200">
          <div class="text-right">
            <span class="text-stone-500 text-sm mr-4">Total:</span>
            <span class="text-stone-900 text-lg font-semibold">RM {{ orderTotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="bg-white border border-stone-200 rounded-xl p-6">
        <label class="block text-sm text-stone-600 mb-1">Notes (optional)</label>
        <textarea
          v-model="form.notes"
          rows="2"
          placeholder="Any special instructions..."
          class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 resize-none"
        ></textarea>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" type="button" @click="$router.push('/app/dashboard')">Cancel</BaseButton>
        <BaseButton variant="primary" type="submit" :loading="saving" :disabled="form.items.length === 0">
          Create Draft Invoice
        </BaseButton>
      </div>
    </form>

    <!-- New Customer Confirmation Modal -->
    <BaseModal v-model="showNewCustomerModal" title="New Customer Record" size="sm">
      <p class="text-stone-600 text-sm">
        No existing customer selected. A <strong class="text-stone-900">new customer record</strong> will be created from this order:
      </p>
      <div class="mt-3 bg-stone-200/50 rounded-lg p-3 space-y-1 text-sm">
        <p v-if="form.customerName" class="text-stone-700"><span class="text-stone-500 w-16 inline-block">Name:</span> {{ form.customerName }}</p>
        <p v-if="form.customerPhone" class="text-stone-700"><span class="text-stone-500 w-16 inline-block">Phone:</span> {{ form.customerPhone }}</p>
        <p v-if="form.vehiclePlate" class="text-green-600"><span class="text-stone-500 w-16 inline-block">Vehicle:</span> {{ form.vehiclePlate }} {{ [form.vehicleMake, form.vehicleModel].filter(Boolean).join(' ') }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showNewCustomerModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="confirmSubmit">Confirm & Create</BaseButton>
      </template>
    </BaseModal>

    <!-- Duplicate Customer Warning Modal -->
    <BaseModal v-model="showDuplicateModal" title="Possible Duplicate" size="sm">
      <p class="text-stone-600 text-sm mb-3">
        We found an existing customer that may match. Did you mean:
      </p>
      <div class="space-y-2">
        <button
          v-for="c in duplicateMatches"
          :key="c.id"
          type="button"
          @click="useDuplicate(c)"
          class="w-full text-left bg-stone-200 border border-stone-300 rounded-lg px-4 py-3 hover:border-green-600/40 transition-colors"
        >
          <div class="flex justify-between">
            <span class="text-stone-900 font-medium">{{ c.name }}</span>
            <span class="text-stone-500 text-xs">{{ c.phone }}</span>
          </div>
          <div v-if="c.vehicles?.length" class="flex gap-2 mt-1">
            <span v-for="v in c.vehicles" :key="v.id" class="text-green-600 text-xs bg-green-600/10 px-2 py-0.5 rounded">{{ v.plate }}</span>
          </div>
        </button>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="skipDuplicate">No, create new customer</BaseButton>
      </template>
    </BaseModal>

    <!-- New Vehicle for Existing Customer Modal -->
    <BaseModal v-model="showNewVehicleModal" title="New Vehicle Detected" size="sm">
      <p class="text-stone-600 text-sm">
        The plate <strong class="text-green-600">{{ form.vehiclePlate }}</strong> is not registered for <strong class="text-stone-900">{{ selectedCustomer?.name }}</strong>.
      </p>
      <p class="text-stone-600 text-sm mt-2">Add it as a new vehicle for this customer?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showNewVehicleModal = false; proceedSubmit()">Skip</BaseButton>
        <BaseButton variant="primary" @click="showNewVehicleModal = false; addNewVehicleAndSubmit()">Yes, add vehicle</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDocumentStore } from '../../stores/documents'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import type { Customer, Vehicle, StockItem } from '../../types'

const router = useRouter()
const docStore = useDocumentStore()
const toast = useToast()
const saving = ref(false)

const workers = ref<{ id: string; name: string; jobTitle?: string }[]>([])
const customerSearch = ref('')
const searchResults = ref<Customer[]>([])
const showResults = ref(false)

// Selected customer/vehicle tracking
const selectedCustomer = ref<Customer | null>(null)
const selectedVehicleId = ref('')

// Modals
const showNewCustomerModal = ref(false)
const showDuplicateModal = ref(false)
const showNewVehicleModal = ref(false)
const duplicateMatches = ref<Customer[]>([])

interface OrderItem {
  stockItemId?: string
  itemCode?: string
  searchTerm: string
  description: string
  quantity: number
  unitPrice: number
  unit: string
  serviceDate: string
  showDropdown: boolean
  stockResults: StockItem[]
  isCustom?: boolean
}

const form = reactive({
  customerName: '',
  customerPhone: '',
  vehiclePlate: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleColor: '',
  vehicleMileage: '',
  vehicleEngineNo: '',
  foremanId: '',
  notes: '',
  items: [] as OrderItem[],
})

const orderTotal = computed(() =>
  form.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0)
)

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function addItem() {
  form.items.push({
    searchTerm: '', description: '', quantity: 1, unitPrice: 0,
    unit: 'PCS', serviceDate: '', showDropdown: false, stockResults: [],
  })
}

function addCustomItem() {
  form.items.push({
    searchTerm: '', description: '', quantity: 1, unitPrice: 0,
    unit: 'PCS', serviceDate: '', showDropdown: false, stockResults: [], isCustom: true,
  })
}

function removeItem(idx: number) {
  form.items.splice(idx, 1)
}

// ─── Customer search ──────────────────────────────
let customerTimer: ReturnType<typeof setTimeout>
function debouncedSearch() {
  clearTimeout(customerTimer)
  customerTimer = setTimeout(async () => {
    if (customerSearch.value.length < 1) { searchResults.value = []; return }
    try {
      const { data } = await api.get('/customers/search', { params: { q: customerSearch.value } })
      searchResults.value = data.data
      showResults.value = true
    } catch { /* ignore */ }
  }, 300)
}

function selectCustomer(c: Customer) {
  selectedCustomer.value = c
  form.customerName = c.name
  form.customerPhone = c.phone || ''
  if (c.vehicles?.length) {
    const defaultV = c.vehicles.find((v) => v.isDefault) || c.vehicles[0]
    selectVehicle(defaultV)
  }
  showResults.value = false
  customerSearch.value = ''
}

function selectVehicle(v: Vehicle) {
  selectedVehicleId.value = v.id
  form.vehiclePlate = v.plate
  form.vehicleMake = v.make || ''
  form.vehicleModel = v.model || ''
  form.vehicleColor = v.color || ''
  form.vehicleMileage = v.mileage || ''
  form.vehicleEngineNo = v.engineNo || ''
}

function clearCustomer() {
  selectedCustomer.value = null
  selectedVehicleId.value = ''
  form.customerName = ''
  form.customerPhone = ''
  form.vehiclePlate = ''
  form.vehicleMake = ''
  form.vehicleModel = ''
  form.vehicleColor = ''
  form.vehicleMileage = ''
  form.vehicleEngineNo = ''
}

// ─── Stock search ─────────────────────────────────
let stockTimers: Record<number, ReturnType<typeof setTimeout>> = {}
function searchStock(idx: number, term: string) {
  clearTimeout(stockTimers[idx])
  form.items[idx].searchTerm = term
  if (term.length < 1) { form.items[idx].stockResults = []; return }
  stockTimers[idx] = setTimeout(async () => {
    try {
      const { data } = await api.get('/stock', { params: { search: term, limit: 8 } })
      form.items[idx].stockResults = data.data
      form.items[idx].showDropdown = true
    } catch { /* ignore */ }
  }, 200)
}

function selectStock(idx: number, s: StockItem) {
  form.items[idx].stockItemId = s.id
  form.items[idx].itemCode = s.itemCode
  form.items[idx].description = s.description
  form.items[idx].unitPrice = Number(s.sellPrice)
  form.items[idx].unit = s.uom
  form.items[idx].searchTerm = `${s.itemCode} - ${s.description}`
  form.items[idx].showDropdown = false
  form.items[idx].stockResults = []
}

// ─── Submit flow ──────────────────────────────────
async function handleSubmit() {
  if (form.items.length === 0) return

  if (!selectedCustomer.value && !form.customerPhone.trim() && !form.vehiclePlate.trim()) {
    toast.error('Please enter at least a phone number or plate number')
    return
  }

  if (selectedCustomer.value) {
    // Existing customer — check if plate changed (new vehicle?)
    const currentPlate = form.vehiclePlate.trim().toUpperCase()
    const knownPlates = selectedCustomer.value.vehicles?.map((v) => v.plate.toUpperCase()) || []

    if (currentPlate && !knownPlates.includes(currentPlate)) {
      showNewVehicleModal.value = true
      return
    }

    // Update mileage if changed
    await updateMileageIfNeeded()
    await proceedSubmit()
  } else {
    // No customer selected — check for duplicates first
    if (form.customerPhone || form.vehiclePlate) {
      try {
        const q = form.customerPhone || form.vehiclePlate
        const { data } = await api.get('/customers/search', { params: { q } })
        if (data.data.length > 0) {
          duplicateMatches.value = data.data
          showDuplicateModal.value = true
          return
        }
      } catch { /* ignore */ }
    }
    // No duplicates — show new customer confirmation
    showNewCustomerModal.value = true
  }
}

function useDuplicate(c: Customer) {
  selectCustomer(c)
  showDuplicateModal.value = false
  toast.info('Customer selected — review vehicle info and submit again')
}

function skipDuplicate() {
  showDuplicateModal.value = false
  showNewCustomerModal.value = true
}

async function confirmSubmit() {
  showNewCustomerModal.value = false
  saving.value = true
  try {
    // Auto-create customer
    const vehicleData = form.vehiclePlate ? [{
      plate: form.vehiclePlate,
      make: form.vehicleMake || undefined,
      model: form.vehicleModel || undefined,
      color: form.vehicleColor || undefined,
      engineNo: form.vehicleEngineNo || undefined,
      mileage: form.vehicleMileage || undefined,
    }] : undefined

    const { data: custData } = await api.post('/customers', {
      name: form.customerName || form.customerPhone || 'Walk-in',
      phone: form.customerPhone || undefined,
      vehicles: vehicleData,
    })
    const newCustomer = custData.data
    selectedCustomer.value = newCustomer
    if (newCustomer.vehicles?.length) {
      selectedVehicleId.value = newCustomer.vehicles[0].id
    }
    toast.success(`Customer "${newCustomer.name}" created`)
    await proceedSubmit()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to create customer')
    saving.value = false
  }
}

async function addNewVehicleAndSubmit() {
  if (!selectedCustomer.value) return
  try {
    await api.post(`/customers/${selectedCustomer.value.id}/vehicles`, {
      plate: form.vehiclePlate,
      make: form.vehicleMake || undefined,
      model: form.vehicleModel || undefined,
      color: form.vehicleColor || undefined,
      engineNo: form.vehicleEngineNo || undefined,
      mileage: form.vehicleMileage || undefined,
    })
    toast.success(`Vehicle ${form.vehiclePlate} added to ${selectedCustomer.value.name}`)
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to add vehicle')
  }
  await proceedSubmit()
}

async function updateMileageIfNeeded() {
  if (!selectedCustomer.value || !selectedVehicleId.value || !form.vehicleMileage) return
  const vehicle = selectedCustomer.value.vehicles?.find((v) => v.id === selectedVehicleId.value)
  if (vehicle && form.vehicleMileage !== (vehicle.mileage || '')) {
    try {
      await api.put(`/customers/${selectedCustomer.value.id}/vehicles/${selectedVehicleId.value}`, {
        mileage: form.vehicleMileage,
      })
    } catch { /* silent — don't block order creation */ }
  }
}

async function proceedSubmit() {
  saving.value = true
  try {
    const vehicleModelFull = [form.vehicleMake, form.vehicleModel].filter(Boolean).join(' ') || undefined
    const doc = await docStore.createDocument({
      documentType: 'INVOICE',
      customerId: selectedCustomer.value?.id || undefined,
      vehicleId: selectedVehicleId.value || undefined,
      customerName: form.customerName || undefined,
      customerPhone: form.customerPhone || undefined,
      vehiclePlate: form.vehiclePlate || undefined,
      vehicleModel: vehicleModelFull,
      vehicleMileage: form.vehicleMileage || undefined,
      vehicleColor: form.vehicleColor || undefined,
      vehicleEngineNo: form.vehicleEngineNo || undefined,
      foremanId: form.foremanId || undefined,
      notes: form.notes || undefined,
      items: form.items.map((item, idx) => ({
        stockItemId: item.stockItemId,
        itemCode: item.itemCode,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit,
        serviceDate: item.serviceDate || undefined,
        sortOrder: idx,
      })),
    })
    toast.success(`Draft invoice ${doc.documentNumber} created`)
    router.push(`/app/documents/${doc.id}`)
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to create order')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  addItem()
  try {
    const { data } = await api.get('/staff', { params: { limit: '100' } })
    workers.value = data.data
  } catch { /* ignore */ }
})

document.addEventListener('click', () => {
  showResults.value = false
  form.items.forEach((item) => { item.showDropdown = false })
})
</script>
