<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-stone-500 hover:text-stone-700 transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold text-stone-900">
        {{ isEdit ? `Edit ${store.getDocTypeLabel(form.documentType)}` : `New ${store.getDocTypeLabel(form.documentType)}` }}
      </h2>
    </div>

    <div v-if="pageLoading" class="text-stone-500">Loading...</div>

    <form v-else @submit.prevent="handleSubmit" class="grid lg:grid-cols-3 gap-6">
      <!-- Main Form (2/3) -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Customer & Vehicle Info -->
        <div class="bg-white border border-stone-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Customer & Vehicle</h3>

          <!-- Customer Search -->
          <div class="relative mb-4">
            <Users class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              v-model="customerSearch"
              @input="handleCustomerSearch"
              @focus="showCustomerResults = true"
              type="text"
              placeholder="Search by phone, plate, name, or model..."
              class="w-full bg-stone-200 border border-stone-300 rounded-lg pl-10 pr-3 py-2.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
            />
            <!-- Selected indicator -->
            <div v-if="selectedCustomer" class="mt-2 flex items-center gap-2">
              <span class="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded">Existing customer: {{ selectedCustomer.name }}</span>
              <button type="button" @click="clearCustomer" class="text-stone-500 hover:text-red-400 text-xs">(clear)</button>
            </div>
            <div
              v-if="showCustomerResults && customerResults.length"
              class="absolute z-20 mt-1 w-full bg-stone-200 border border-stone-300 rounded-lg shadow-xl max-h-48 overflow-y-auto"
            >
              <button
                v-for="c in customerResults"
                :key="c.id"
                type="button"
                @click="selectCustomer(c)"
                class="w-full text-left px-4 py-2.5 hover:bg-stone-300 transition-colors"
              >
                <div class="flex justify-between">
                  <span class="text-stone-900 text-sm font-medium">{{ c.name }}</span>
                  <span v-if="c.phone" class="text-stone-500 text-sm">{{ c.phone }}</span>
                </div>
                <div v-if="c.vehicles?.length" class="flex gap-2 mt-1">
                  <span v-for="v in c.vehicles" :key="v.id" class="text-green-600 text-xs bg-green-600/10 px-2 py-0.5 rounded">
                    {{ v.plate }} <span v-if="v.make || v.model" class="text-stone-500">({{ [v.make, v.model].filter(Boolean).join(' ') }})</span>
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Vehicle Switcher -->
          <div v-if="selectedCustomer && selectedCustomer.vehicles && selectedCustomer.vehicles.length > 1" class="mb-4">
            <label class="block text-sm text-stone-600 mb-1">Select Vehicle</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="v in selectedCustomer.vehicles"
                :key="v.id"
                type="button"
                @click="applyVehicle(v)"
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

          <div class="grid sm:grid-cols-2 gap-4">
            <BaseInput v-model="form.customerName" label="Customer Name" placeholder="e.g. Ahmad bin Ali" />
            <BaseInput v-model="form.customerPhone" label="Phone" placeholder="+60 12-345 6789" />
            <BaseInput v-model="form.vehiclePlate" label="Plate Number" placeholder="e.g. JUX 1589" />
            <BaseInput v-model="form.vehicleModel" label="Make & Model" placeholder="e.g. Honda Accord T2A" />
            <BaseInput v-model="form.vehicleMileage" label="Mileage (KM)" placeholder="e.g. 57028" />
            <BaseInput v-model="form.vehicleColor" label="Color" placeholder="e.g. White" />
            <BaseInput v-model="form.vehicleEngineNo" label="Engine No" placeholder="e.g. R20A3-123456" />
            <BaseInput v-model="form.customerEmail" label="Email" type="email" placeholder="customer@email.com" />
          </div>

          <!-- Foreman -->
          <div class="mt-4">
            <BaseSelect v-model="form.foremanId" label="Foreman / Salesperson" placeholder="Select staff">
              <option v-for="w in workers" :key="w.id" :value="w.id">{{ w.name }}{{ w.jobTitle ? ` (${w.jobTitle})` : '' }}</option>
            </BaseSelect>
          </div>
        </div>

        <!-- Line Items -->
        <div class="bg-white border border-stone-200 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Items</h3>
            <button type="button" @click="addCustomItem" class="text-xs text-stone-500 hover:text-green-600 transition-colors flex items-center gap-1">
              <Plus class="w-3.5 h-3.5" /> Custom Item
            </button>
          </div>

          <!-- Stock Search -->
          <div class="relative mb-4">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              v-model="stockSearch"
              @input="handleStockSearch"
              @focus="showStockResults = true"
              type="text"
              placeholder="Search stock by item code or description..."
              class="w-full bg-stone-200 border border-stone-300 rounded-lg pl-10 pr-3 py-2.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
            />
            <div
              v-if="showStockResults && stockResults.length"
              class="absolute z-10 mt-1 w-full bg-stone-200 border border-stone-300 rounded-lg shadow-xl max-h-48 overflow-y-auto"
            >
              <button
                v-for="item in stockResults"
                :key="item.id"
                type="button"
                @click="addStockItem(item)"
                class="w-full text-left px-4 py-2.5 hover:bg-stone-300 transition-colors flex items-center justify-between"
              >
                <div>
                  <span class="text-green-600 font-mono text-sm">{{ item.itemCode }}</span>
                  <span class="text-stone-700 text-sm ml-2">{{ item.description }}</span>
                </div>
                <div class="text-right">
                  <span class="text-stone-600 text-sm">RM {{ Number(item.sellPrice).toFixed(2) }}</span>
                  <span class="text-stone-500 text-xs ml-2">({{ item.quantity }} in stock)</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Items Table -->
          <div class="overflow-x-auto border border-stone-200 rounded-lg">
            <table class="w-full text-sm">
              <thead class="bg-stone-200/50 text-stone-500 text-xs uppercase border-b border-stone-200">
                <tr>
                  <th class="px-3 py-2.5 text-left w-8">#</th>
                  <th class="px-3 py-2.5 text-left">Description</th>
                  <th class="px-3 py-2.5 text-center w-16">Qty</th>
                  <th class="px-3 py-2.5 text-left w-16">Unit</th>
                  <th class="px-3 py-2.5 text-right w-24">Price</th>
                  <th class="px-3 py-2.5 text-right w-16">Disc%</th>
                  <th class="px-3 py-2.5 text-right w-16">Tax%</th>
                  <th class="px-3 py-2.5 text-center w-28">Service Date</th>
                  <th class="px-3 py-2.5 text-right w-24">Amount</th>
                  <th class="px-3 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-200">
                <tr v-if="!form.items.length">
                  <td colspan="10" class="px-3 py-8 text-center text-stone-500">Add items using the search above or "Custom Item" button</td>
                </tr>
                <tr v-for="(item, idx) in form.items" :key="idx" class="hover:bg-stone-200/20">
                  <td class="px-3 py-2 text-stone-500">{{ idx + 1 }}</td>
                  <td class="px-3 py-2">
                    <div class="flex flex-col gap-1">
                      <span v-if="item.itemCode" class="text-green-600 font-mono text-xs">{{ item.itemCode }}</span>
                      <textarea v-model="item.description" @input="autoResize" rows="1" class="bg-transparent border-0 text-stone-700 text-sm p-0 focus:outline-none focus:ring-0 w-full resize-none overflow-hidden" style="max-height: 120px;" placeholder="Item description" />
                    </div>
                  </td>
                  <td class="px-3 py-2"><input v-model.number="item.quantity" type="number" min="1" class="w-16 bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-600/50" /></td>
                  <td class="px-3 py-2"><input v-model="item.unit" class="w-14 bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-sm focus:outline-none focus:ring-1 focus:ring-green-600/50" /></td>
                  <td class="px-3 py-2"><input v-model.number="item.unitPrice" type="number" step="0.01" min="0" class="w-24 bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-600/50" /></td>
                  <td class="px-3 py-2"><input v-model.number="item.discountPercent" type="number" step="0.1" min="0" max="100" class="w-16 bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-600/50" /></td>
                  <td class="px-3 py-2"><input v-model.number="item.taxRate" type="number" step="0.1" min="0" max="100" class="w-16 bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-600/50" /></td>
                  <td class="px-3 py-2"><input v-model="item.serviceDate" type="date" class="w-28 bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-sm focus:outline-none focus:ring-1 focus:ring-green-600/50" /></td>
                  <td class="px-3 py-2 text-right font-medium text-stone-900">{{ calcItemTotal(item).toFixed(2) }}</td>
                  <td class="px-3 py-2"><button type="button" @click="form.items.splice(idx, 1)" class="text-stone-500 hover:text-red-400 transition-colors"><X class="w-4 h-4" /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notes & Terms -->
        <div class="bg-white border border-stone-200 rounded-xl p-6">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1.5">Notes</label>
              <textarea v-model="form.notes" rows="3" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 resize-none" placeholder="Notes for the customer..." />
            </div>
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1.5">Terms & Conditions</label>
              <textarea v-model="form.terms" rows="3" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 resize-none" placeholder="Payment terms..." />
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar (1/3) -->
      <div class="space-y-6">
        <div class="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Details</h3>
          <BaseInput v-model="form.issueDate" label="Issue Date" type="date" required />
          <BaseInput v-model="form.dueDate" label="Due Date" type="date" />
        </div>
        <div class="bg-white border border-stone-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Summary</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-stone-500">Subtotal</span><span class="text-stone-700">RM {{ calcSubtotal.toFixed(2) }}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">Tax</span><span class="text-stone-700">RM {{ calcTax.toFixed(2) }}</span></div>
            <div class="flex justify-between items-center">
              <span class="text-stone-500">Discount</span>
              <input v-model.number="form.discountAmount" type="number" step="0.01" min="0" class="w-24 bg-stone-200 border border-stone-300 rounded px-2 py-1 text-stone-900 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-600/50" />
            </div>
            <div class="flex justify-between pt-2 border-t border-stone-200">
              <span class="text-stone-900 font-semibold">Total</span>
              <span class="text-green-600 font-bold text-lg">RM {{ calcTotal.toFixed(2) }}</span>
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <BaseButton variant="primary" type="submit" :loading="saving" :disabled="!form.items.length">
            {{ isEdit ? 'Update' : 'Create' }} {{ store.getDocTypeLabel(form.documentType) }}
          </BaseButton>
          <BaseButton variant="secondary" type="button" @click="$router.back()">Cancel</BaseButton>
        </div>
      </div>
    </form>

    <!-- New Customer Confirmation Modal -->
    <BaseModal v-model="showNewCustomerModal" title="New Customer Record" size="sm">
      <p class="text-stone-600 text-sm">No existing customer selected. A <strong class="text-stone-900">new customer record</strong> will be created:</p>
      <div class="mt-3 bg-stone-200/50 rounded-lg p-3 space-y-1 text-sm">
        <p v-if="form.customerName" class="text-stone-700"><span class="text-stone-500">Name:</span> {{ form.customerName }}</p>
        <p v-if="form.customerPhone" class="text-stone-700"><span class="text-stone-500">Phone:</span> {{ form.customerPhone }}</p>
        <p v-if="form.vehiclePlate" class="text-green-600"><span class="text-stone-500">Vehicle:</span> {{ form.vehiclePlate }} {{ form.vehicleModel }}</p>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showNewCustomerModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="confirmNewCustomerAndSubmit">Confirm & Create</BaseButton>
      </template>
    </BaseModal>

    <!-- Duplicate Warning Modal -->
    <BaseModal v-model="showDuplicateModal" title="Possible Duplicate" size="sm">
      <p class="text-stone-600 text-sm mb-3">We found an existing customer that may match:</p>
      <div class="space-y-2">
        <button v-for="c in duplicateMatches" :key="c.id" type="button" @click="useDuplicate(c)" class="w-full text-left bg-stone-200 border border-stone-300 rounded-lg px-4 py-3 hover:border-green-600/40 transition-colors">
          <div class="flex justify-between"><span class="text-stone-900 font-medium">{{ c.name }}</span><span class="text-stone-500 text-xs">{{ c.phone }}</span></div>
          <div v-if="c.vehicles?.length" class="flex gap-2 mt-1"><span v-for="v in c.vehicles" :key="v.id" class="text-green-600 text-xs bg-green-600/10 px-2 py-0.5 rounded">{{ v.plate }}</span></div>
        </button>
      </div>
      <template #footer><BaseButton variant="secondary" @click="showDuplicateModal = false; showNewCustomerModal = true">No, create new</BaseButton></template>
    </BaseModal>

    <!-- New Vehicle Modal -->
    <BaseModal v-model="showNewVehicleModal" title="New Vehicle Detected" size="sm">
      <p class="text-stone-600 text-sm">Plate <strong class="text-green-600">{{ form.vehiclePlate }}</strong> is not registered for <strong class="text-stone-900">{{ selectedCustomer?.name }}</strong>. Add it?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="showNewVehicleModal = false; doSubmit()">Skip</BaseButton>
        <BaseButton variant="primary" @click="addNewVehicleAndSubmit">Yes, add vehicle</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '../../stores/documents'
import { useToast } from '../../composables/useToast'
import { useUnsavedChanges } from '../../composables/useUnsavedChanges'
import api from '../../lib/api'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import { ArrowLeft, Search, Plus, X, Users } from 'lucide-vue-next'
import type { StockItem, DocumentType, Customer, Vehicle } from '../../types'

const route = useRoute()
const router = useRouter()
const store = useDocumentStore()
const toast = useToast()
const { markDirty, markClean } = useUnsavedChanges()

const isEdit = computed(() => !!route.params.id)
const pageLoading = ref(false)
const saving = ref(false)

// Customer state
const customerSearch = ref('')
const customerResults = ref<Customer[]>([])
const showCustomerResults = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const selectedVehicleId = ref('')

// Workers
const workers = ref<{ id: string; name: string; jobTitle?: string }[]>([])

// Stock search
const stockSearch = ref('')
const stockResults = ref<StockItem[]>([])
const showStockResults = ref(false)

// Modals
const showNewCustomerModal = ref(false)
const showDuplicateModal = ref(false)
const showNewVehicleModal = ref(false)
const duplicateMatches = ref<Customer[]>([])

interface FormItem {
  stockItemId?: string
  itemCode?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxRate: number
  serviceDate: string
}

const form = reactive({
  documentType: (route.query.type as DocumentType) || 'INVOICE',
  customerName: '',
  customerCompanyName: '',
  customerPhone: '',
  customerEmail: '',
  vehiclePlate: '',
  vehicleModel: '',
  vehicleMileage: '',
  vehicleColor: '',
  vehicleEngineNo: '',
  foremanId: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
  terms: '',
  footerNote: '',
  discountAmount: 0,
  items: [] as FormItem[],
})

watch(form, () => markDirty(), { deep: true })

function autoResize(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

// ─── Calculations ─────────────────────────────────
function calcItemTotal(item: FormItem): number {
  const sub = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100)
  return Math.round((sub + sub * ((item.taxRate || 0) / 100)) * 100) / 100
}
const calcSubtotal = computed(() => form.items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - (i.discountPercent || 0) / 100), 0))
const calcTax = computed(() => form.items.reduce((s, i) => { const sub = i.quantity * i.unitPrice * (1 - (i.discountPercent || 0) / 100); return s + sub * ((i.taxRate || 0) / 100) }, 0))
const calcTotal = computed(() => Math.round((calcSubtotal.value + calcTax.value - (form.discountAmount || 0)) * 100) / 100)

// ─── Customer search ──────────────────────────────
let customerSearchTimer: ReturnType<typeof setTimeout>
function handleCustomerSearch() {
  clearTimeout(customerSearchTimer)
  if (!customerSearch.value) { customerResults.value = []; return }
  customerSearchTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/customers/search', { params: { q: customerSearch.value } })
      customerResults.value = data.data
      showCustomerResults.value = true
    } catch { customerResults.value = [] }
  }, 200)
}

function selectCustomer(c: Customer) {
  selectedCustomer.value = c
  form.customerName = c.name
  form.customerCompanyName = c.companyName || ''
  form.customerPhone = c.phone || ''
  form.customerEmail = c.email || ''
  customerSearch.value = ''
  customerResults.value = []
  showCustomerResults.value = false
  if (c.vehicles?.length) {
    const defaultV = c.vehicles.find((v) => v.isDefault) || c.vehicles[0]
    applyVehicle(defaultV)
  }
}

function applyVehicle(v: Vehicle) {
  selectedVehicleId.value = v.id
  form.vehiclePlate = v.plate
  form.vehicleModel = [v.make, v.model].filter(Boolean).join(' ')
  form.vehicleMileage = v.mileage || ''
  form.vehicleColor = v.color || ''
  form.vehicleEngineNo = v.engineNo || ''
}

function clearCustomer() {
  selectedCustomer.value = null
  selectedVehicleId.value = ''
  form.customerName = ''
  form.customerCompanyName = ''
  form.customerPhone = ''
  form.customerEmail = ''
  form.vehiclePlate = ''
  form.vehicleModel = ''
  form.vehicleMileage = ''
  form.vehicleColor = ''
  form.vehicleEngineNo = ''
}

// ─── Stock search ─────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout>
function handleStockSearch() {
  clearTimeout(searchTimer)
  if (!stockSearch.value) { stockResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/stock', { params: { search: stockSearch.value, limit: 10 } })
      stockResults.value = data.data
      showStockResults.value = true
    } catch { stockResults.value = [] }
  }, 200)
}

function addStockItem(stock: StockItem) {
  form.items.push({
    stockItemId: stock.id, itemCode: stock.itemCode, description: stock.description,
    quantity: 1, unit: stock.uom, unitPrice: Number(stock.sellPrice),
    discountPercent: 0, taxRate: 0, serviceDate: '',
  })
  stockSearch.value = ''; stockResults.value = []; showStockResults.value = false
}

function addCustomItem() {
  form.items.push({ description: '', quantity: 1, unit: 'PCS', unitPrice: 0, discountPercent: 0, taxRate: 0, serviceDate: '' })
}

// ─── Load document (edit mode) ────────────────────
async function loadDocument() {
  if (!route.params.id) return
  pageLoading.value = true
  try {
    const doc = await store.getDocument(route.params.id as string)
    form.documentType = doc.documentType
    form.customerName = doc.customerName || ''
    form.customerCompanyName = doc.customerCompanyName || ''
    form.customerPhone = doc.customerPhone || ''
    form.customerEmail = doc.customerEmail || ''
    form.vehiclePlate = doc.vehiclePlate || ''
    form.vehicleModel = doc.vehicleModel || ''
    form.vehicleMileage = doc.vehicleMileage || ''
    form.vehicleColor = doc.vehicleColor || ''
    form.vehicleEngineNo = doc.vehicleEngineNo || ''
    form.foremanId = doc.foremanId || ''
    form.issueDate = doc.issueDate.split('T')[0]
    form.dueDate = doc.dueDate?.split('T')[0] || ''
    form.notes = doc.notes || ''
    form.terms = doc.terms || ''
    form.footerNote = doc.footerNote || ''
    form.discountAmount = Number(doc.discountAmount)
    form.items = (doc.items || []).map((i) => ({
      stockItemId: i.stockItemId || undefined, itemCode: i.itemCode || undefined,
      description: i.description, quantity: i.quantity, unit: i.unit,
      unitPrice: Number(i.unitPrice), discountPercent: Number(i.discountPercent),
      taxRate: Number(i.taxRate), serviceDate: i.serviceDate?.split('T')[0] || '',
    }))
    // Restore customer link if exists
    if ((doc as any).customerId) {
      try {
        const { data } = await api.get(`/customers/${(doc as any).customerId}`)
        selectedCustomer.value = data.data
        selectedVehicleId.value = (doc as any).vehicleId || ''
      } catch { /* ignore */ }
    }
  } catch {
    toast.error('Failed to load document')
    router.push('/app/documents')
  } finally {
    pageLoading.value = false
  }
}

// ─── Submit flow ──────────────────────────────────
async function handleSubmit() {
  if (!form.items.length) return

  // Edit mode — submit directly
  if (isEdit.value) { await doSubmit(); return }

  if (selectedCustomer.value) {
    // Check for new vehicle
    const plate = form.vehiclePlate.trim().toUpperCase()
    const known = selectedCustomer.value.vehicles?.map((v) => v.plate.toUpperCase()) || []
    if (plate && !known.includes(plate)) { showNewVehicleModal.value = true; return }
    // Update mileage
    await updateMileage()
    await doSubmit()
  } else {
    // Check for duplicates
    if (form.customerPhone || form.vehiclePlate) {
      try {
        const { data } = await api.get('/customers/search', { params: { q: form.customerPhone || form.vehiclePlate } })
        if (data.data.length > 0) { duplicateMatches.value = data.data; showDuplicateModal.value = true; return }
      } catch { /* ignore */ }
    }
    showNewCustomerModal.value = true
  }
}

function useDuplicate(c: Customer) {
  selectCustomer(c)
  showDuplicateModal.value = false
  toast.info('Customer selected — review and submit again')
}

async function confirmNewCustomerAndSubmit() {
  showNewCustomerModal.value = false
  saving.value = true
  try {
    const vehicles = form.vehiclePlate ? [{ plate: form.vehiclePlate, model: form.vehicleModel || undefined, mileage: form.vehicleMileage || undefined, color: form.vehicleColor || undefined, engineNo: form.vehicleEngineNo || undefined }] : undefined
    const { data } = await api.post('/customers', { name: form.customerName || form.customerPhone || 'Walk-in', phone: form.customerPhone || undefined, email: form.customerEmail || undefined, vehicles })
    selectedCustomer.value = data.data
    if (data.data.vehicles?.length) selectedVehicleId.value = data.data.vehicles[0].id
    toast.success(`Customer "${data.data.name}" created`)
    await doSubmit()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to create customer')
    saving.value = false
  }
}

async function addNewVehicleAndSubmit() {
  showNewVehicleModal.value = false
  if (selectedCustomer.value) {
    try {
      const { data } = await api.post(`/customers/${selectedCustomer.value.id}/vehicles`, {
        plate: form.vehiclePlate, model: form.vehicleModel || undefined, mileage: form.vehicleMileage || undefined,
        color: form.vehicleColor || undefined, engineNo: form.vehicleEngineNo || undefined,
      })
      selectedVehicleId.value = data.data.id
      toast.success(`Vehicle ${form.vehiclePlate} added`)
    } catch { /* continue */ }
  }
  await doSubmit()
}

async function updateMileage() {
  if (!selectedCustomer.value || !selectedVehicleId.value || !form.vehicleMileage) return
  const v = selectedCustomer.value.vehicles?.find((v) => v.id === selectedVehicleId.value)
  if (v && form.vehicleMileage !== (v.mileage || '')) {
    try { await api.put(`/customers/${selectedCustomer.value.id}/vehicles/${selectedVehicleId.value}`, { mileage: form.vehicleMileage }) } catch { /* silent */ }
  }
}

async function doSubmit() {
  saving.value = true
  try {
    const payload = {
      ...form,
      customerId: selectedCustomer.value?.id || undefined,
      vehicleId: selectedVehicleId.value || undefined,
      items: form.items.map((i, idx) => ({ ...i, sortOrder: idx })),
    }
    if (isEdit.value) {
      await store.updateDocument(route.params.id as string, payload)
      toast.success('Document updated')
    } else {
      const doc = await store.createDocument(payload)
      toast.success(`${doc.documentNumber} created`)
      markClean()
      router.push(`/app/documents/${doc.id}`)
      return
    }
    markClean()
    router.push('/app/documents')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save document')
  } finally {
    saving.value = false
  }
}

function closeDropdown() { showStockResults.value = false; showCustomerResults.value = false }
onMounted(async () => {
  document.addEventListener('click', closeDropdown)
  loadDocument()
  try { const { data } = await api.get('/staff', { params: { limit: '100' } }); workers.value = data.data } catch { /* ignore */ }
})
onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
  clearTimeout(searchTimer)
  clearTimeout(customerSearchTimer)
})
</script>
