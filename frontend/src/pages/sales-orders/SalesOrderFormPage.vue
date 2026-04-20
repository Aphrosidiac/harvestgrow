<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="p-1.5 text-stone-500 hover:text-stone-700 transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold text-stone-900">{{ isEdit ? `Edit ${form.salesOrderNumber}` : 'New Sales Order' }}</h2>
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Main form -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Customer -->
        <div class="bg-white border border-stone-200 rounded-xl p-5">
          <h3 class="text-xs font-semibold text-stone-500 uppercase mb-4">Customer</h3>
          <div class="space-y-4">
            <div class="relative">
              <label class="block text-xs text-stone-500 mb-1">Search Customer</label>
              <input
                v-model="customerSearch"
                type="text"
                placeholder="Search by name, phone, company..."
                class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
                @input="searchCustomers"
              />
              <div v-if="customerResults.length" class="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <button
                  v-for="c in customerResults"
                  :key="c.id"
                  @click="selectCustomer(c)"
                  class="w-full text-left px-3 py-2 text-sm hover:bg-stone-200/50 transition-colors"
                >
                  <div class="font-medium text-stone-900">{{ c.companyName || c.name }}</div>
                  <div class="text-xs text-stone-500">{{ c.phone }} {{ c.companyCode ? `(${c.companyCode})` : '' }}</div>
                </button>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <BaseInput v-model="form.customerName" label="Name" placeholder="Customer name" />
              <BaseInput v-model="form.customerCompanyName" label="Company" placeholder="Company name" />
            </div>
            <div class="grid grid-cols-3 gap-4">
              <BaseInput v-model="form.customerCompanyCode" label="Code" placeholder="e.g. 300-E0001" />
              <BaseInput v-model="form.customerPhone" label="Phone" placeholder="+60..." />
              <BaseInput v-model="form.customerEmail" label="Email" type="email" placeholder="email" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <BaseInput v-model="form.customerBranchLocation" label="Branch Location" placeholder="e.g. DANGA BAY" />
              <BaseInput v-model="form.customerBranchCode" label="Branch Code" placeholder="e.g. DB" />
            </div>
          </div>
        </div>

        <!-- Delivery & Order Details -->
        <div class="bg-white border border-stone-200 rounded-xl p-5">
          <h3 class="text-xs font-semibold text-stone-500 uppercase mb-4">Order Details</h3>
          <div class="grid grid-cols-2 gap-4">
            <BaseInput v-model="form.deliveryDate" label="Delivery Date" type="date" required />
            <BaseSelect v-model="form.deliverySlot" label="Delivery Slot" required>
              <option value="TOMORROW_MORNING">Tomorrow Morning</option>
              <option value="AFTERNOON">Afternoon</option>
              <option value="MORNING">Morning</option>
            </BaseSelect>
          </div>
          <div class="grid grid-cols-2 gap-4 mt-4">
            <BaseInput v-model="form.truck" label="Truck" placeholder="Truck plate / identifier" />
            <BaseInput v-model="form.poNumber" label="PO Number" placeholder="Customer PO" />
          </div>
          <div class="mt-4">
            <label class="block text-xs text-stone-500 mb-1">Delivery Address</label>
            <textarea v-model="form.deliveryAddress" rows="2" placeholder="Delivery address" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500 resize-none" />
          </div>
        </div>

        <!-- Items -->
        <div class="bg-white border border-stone-200 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xs font-semibold text-stone-500 uppercase">Items</h3>
            <BaseButton variant="secondary" size="sm" @click="addItem">
              <Plus class="w-4 h-4 mr-1" /> Add Item
            </BaseButton>
          </div>
          <div v-if="!form.items.length" class="text-center text-stone-400 py-8 text-sm">No items added yet.</div>
          <div v-else class="space-y-3">
            <div v-for="(item, idx) in form.items" :key="idx" class="border border-stone-200 rounded-lg p-3">
              <div class="grid grid-cols-12 gap-3 items-end">
                <div class="col-span-4">
                  <label class="block text-xs text-stone-500 mb-1">Description</label>
                  <input v-model="item.description" placeholder="Item description" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-stone-500 mb-1">Qty</label>
                  <input v-model.number="item.quantity" type="number" step="0.001" min="0" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
                </div>
                <div class="col-span-1">
                  <label class="block text-xs text-stone-500 mb-1">Unit</label>
                  <input v-model="item.unit" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs text-stone-500 mb-1">Price</label>
                  <input v-model.number="item.unitPrice" type="number" step="0.01" min="0" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
                </div>
                <div class="col-span-2 text-right">
                  <label class="block text-xs text-stone-500 mb-1">Total</label>
                  <div class="text-sm font-medium text-stone-900 py-1.5">RM {{ lineTotal(item) }}</div>
                </div>
                <div class="col-span-1 text-right">
                  <button @click="form.items.splice(idx, 1)" class="p-1.5 text-stone-400 hover:text-red-400 transition-colors">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div class="bg-white border border-stone-200 rounded-xl p-5">
          <h3 class="text-xs font-semibold text-stone-500 uppercase mb-3">Notes</h3>
          <textarea v-model="form.notes" rows="3" placeholder="Any special instructions" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500 resize-none" />
        </div>
      </div>

      <!-- Sidebar summary -->
      <div>
        <div class="bg-white border border-stone-200 rounded-xl p-5 sticky top-6">
          <h3 class="text-xs font-semibold text-stone-500 uppercase mb-4">Summary</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span>RM {{ grandSubtotal }}</span>
            </div>
            <div class="flex justify-between text-stone-600">
              <span>Tax</span>
              <span>RM {{ grandTax }}</span>
            </div>
            <div class="border-t border-stone-200 pt-2 flex justify-between text-stone-900 font-semibold text-base">
              <span>Total</span>
              <span>RM {{ grandTotal }}</span>
            </div>
          </div>
          <BaseButton variant="primary" class="w-full mt-6" :loading="saving" @click="handleSubmit">
            {{ isEdit ? 'Update Order' : 'Create Order' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSalesOrderStore } from '../../stores/salesOrders'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import { ArrowLeft, Plus, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useSalesOrderStore()
const toast = useToast()
const saving = ref(false)

const isEdit = computed(() => !!route.params.id)

interface FormItem {
  stockItemId?: string
  itemCode?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  taxRate: number
  notes?: string
}

const form = reactive({
  salesOrderNumber: '',
  customerId: '' as string,
  customerName: '',
  customerCompanyName: '',
  customerCompanyCode: '',
  customerPhone: '',
  customerEmail: '',
  customerBranchLocation: '',
  customerBranchCode: '',
  deliveryDate: new Date().toISOString().slice(0, 10),
  deliverySlot: 'TOMORROW_MORNING',
  deliveryAddress: '',
  truck: '',
  poNumber: '',
  invoiceNumber: '',
  notes: '',
  discountAmount: 0,
  items: [] as FormItem[],
})

const customerSearch = ref('')
const customerResults = ref<any[]>([])
let searchTimeout: ReturnType<typeof setTimeout>

function searchCustomers() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!customerSearch.value || customerSearch.value.length < 2) {
      customerResults.value = []
      return
    }
    try {
      const { data } = await api.get('/customers', { params: { search: customerSearch.value, limit: '10' } })
      customerResults.value = data.data
    } catch {
      customerResults.value = []
    }
  }, 300)
}

function selectCustomer(c: any) {
  form.customerId = c.id
  form.customerName = c.name || ''
  form.customerCompanyName = c.companyName || ''
  form.customerCompanyCode = c.companyCode || ''
  form.customerPhone = c.phone || ''
  form.customerEmail = c.email || ''
  form.customerBranchLocation = c.branchLocation || ''
  form.customerBranchCode = c.branchCode || ''
  form.deliveryAddress = c.address || ''
  customerSearch.value = c.companyName || c.name || ''
  customerResults.value = []
}

function addItem() {
  form.items.push({
    description: '',
    quantity: 1,
    unit: 'kg',
    unitPrice: 0,
    discountPercent: 0,
    taxRate: 0,
  })
}

function lineTotal(item: FormItem): string {
  const sub = item.quantity * item.unitPrice * (1 - (item.discountPercent || 0) / 100)
  const tax = sub * ((item.taxRate || 0) / 100)
  return (sub + tax).toFixed(2)
}

const grandSubtotal = computed(() => {
  return form.items.reduce((sum, i) => sum + i.quantity * i.unitPrice * (1 - (i.discountPercent || 0) / 100), 0).toFixed(2)
})
const grandTax = computed(() => {
  return form.items.reduce((sum, i) => {
    const sub = i.quantity * i.unitPrice * (1 - (i.discountPercent || 0) / 100)
    return sum + sub * ((i.taxRate || 0) / 100)
  }, 0).toFixed(2)
})
const grandTotal = computed(() => {
  return (Number(grandSubtotal.value) + Number(grandTax.value) - form.discountAmount).toFixed(2)
})

async function handleSubmit() {
  if (!form.deliveryDate || !form.deliverySlot) {
    toast.error('Delivery date and slot are required')
    return
  }
  if (!form.items.length) {
    toast.error('Add at least one item')
    return
  }

  saving.value = true
  try {
    const payload = {
      customerId: form.customerId || null,
      deliveryDate: form.deliveryDate,
      deliverySlot: form.deliverySlot,
      deliveryAddress: form.deliveryAddress,
      truck: form.truck,
      poNumber: form.poNumber,
      invoiceNumber: form.invoiceNumber,
      notes: form.notes,
      discountAmount: form.discountAmount,
      items: form.items.map((i) => ({
        stockItemId: i.stockItemId || null,
        itemCode: i.itemCode || null,
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent,
        taxRate: i.taxRate,
        notes: i.notes || null,
      })),
    }

    if (isEdit.value) {
      await store.updateSalesOrder(route.params.id as string, payload)
      toast.success('Sales order updated')
    } else {
      await store.createSalesOrder(payload)
      toast.success('Sales order created')
    }
    router.push('/app/sales-order')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) {
    try {
      const order = await store.getSalesOrder(route.params.id as string)
      form.salesOrderNumber = order.salesOrderNumber
      form.customerId = order.customerId || ''
      form.customerName = order.customerName || ''
      form.customerCompanyName = order.customerCompanyName || ''
      form.customerCompanyCode = order.customerCompanyCode || ''
      form.customerPhone = order.customerPhone || ''
      form.customerEmail = order.customerEmail || ''
      form.customerBranchLocation = order.customerBranchLocation || ''
      form.customerBranchCode = order.customerBranchCode || ''
      form.deliveryDate = order.deliveryDate?.slice(0, 10) || ''
      form.deliverySlot = order.deliverySlot
      form.deliveryAddress = order.deliveryAddress || ''
      form.truck = order.truck || ''
      form.poNumber = order.poNumber || ''
      form.invoiceNumber = order.invoiceNumber || ''
      form.notes = order.notes || ''
      form.discountAmount = Number(order.discountAmount)
      customerSearch.value = order.customerCompanyName || order.customerName || ''
      form.items = (order.items || []).map((i) => ({
        stockItemId: i.stockItemId,
        itemCode: i.itemCode,
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        discountPercent: Number(i.discountPercent),
        taxRate: Number(i.taxRate),
        notes: i.notes,
      }))
    } catch {
      toast.error('Failed to load order')
      router.push('/app/sales-order')
    }
  }
})
</script>
