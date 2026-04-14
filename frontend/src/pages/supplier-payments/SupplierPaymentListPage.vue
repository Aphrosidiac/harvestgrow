<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">A/P Payments</h2>
      <BaseButton variant="primary" size="sm" @click="showCreateModal = true">
        <Plus class="w-4 h-4 mr-1" /> Record Payment
      </BaseButton>
    </div>

    <!-- Filters -->
    <div class="flex items-end gap-4 mb-6">
      <div class="flex-1 max-w-xs">
        <label class="block text-xs text-stone-500 mb-1">Search</label>
        <input v-model="search" type="text" placeholder="Payment no, supplier..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">From</label>
        <input v-model="filterFrom" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      </div>
      <div>
        <label class="block text-xs text-stone-500 mb-1">To</label>
        <input v-model="filterTo" type="date" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      </div>
    </div>

    <!-- Table -->
    <BaseTable :columns="columns" :data="payments" :loading="loading" empty-text="No payments found.">
      <template #cell-paymentNumber="{ value }">
        <span class="text-stone-900 font-mono font-medium">{{ value }}</span>
      </template>
      <template #cell-supplier="{ row }">
        <span class="text-stone-600 text-sm">{{ row.supplier?.companyName || '-' }}</span>
      </template>
      <template #cell-purchaseInvoice="{ row }">
        <span v-if="row.purchaseInvoice" class="text-stone-500 text-sm font-mono">{{ row.purchaseInvoice.internalNumber }}</span>
        <span v-else class="text-stone-500 text-sm">-</span>
      </template>
      <template #cell-amount="{ value }">
        <span class="text-red-400 font-medium">RM {{ Number(value).toFixed(2) }}</span>
      </template>
      <template #cell-paymentMethod="{ value }">
        <span class="text-stone-600 text-sm">{{ value?.replace('_', ' ') }}</span>
      </template>
      <template #cell-paymentDate="{ value }">
        <span class="text-stone-500 text-sm">{{ formatDate(value) }}</span>
      </template>
      <template #actions="{ row }">
        <button @click="handleDelete(row)" class="p-1.5 text-stone-500 hover:text-red-400 transition-colors">
          <Trash2 class="w-4 h-4" />
        </button>
      </template>
    </BaseTable>

    <!-- Create Payment Modal -->
    <BaseModal v-model="showCreateModal" title="Record Supplier Payment" size="md">
      <div class="space-y-4">
        <BaseSelect v-model="payForm.supplierId" label="Supplier" required>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.companyName }}</option>
        </BaseSelect>
        <BaseInput v-model="payForm.amount" label="Amount (RM)" type="number" step="0.01" min="0.01" required />
        <BaseSelect v-model="payForm.paymentMethod" label="Payment Method" required>
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="TNG">Touch 'n Go</option>
          <option value="BOOST">Boost</option>
        </BaseSelect>
        <BaseInput v-model="payForm.referenceNumber" label="Reference Number" placeholder="Optional" />
        <BaseInput v-model="payForm.bankName" label="Bank Name" placeholder="Optional" />
        <BaseInput v-model="payForm.notes" label="Notes" placeholder="Optional" />
        <BaseInput v-model="payForm.paymentDate" label="Payment Date" type="date" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCreateModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="saving" @click="handleCreate">Record Payment</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseTable from '../../components/base/BaseTable.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import { Plus, Trash2 } from 'lucide-vue-next'

const toast = useToast()

const payments = ref<any[]>([])
const suppliers = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const search = ref('')
const filterFrom = ref('')
const filterTo = ref('')
const showCreateModal = ref(false)

const payForm = reactive({
  supplierId: '',
  amount: '',
  paymentMethod: 'BANK_TRANSFER',
  referenceNumber: '',
  bankName: '',
  notes: '',
  paymentDate: new Date().toISOString().split('T')[0],
})

const columns = [
  { key: 'paymentNumber', label: 'Pay No.' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'purchaseInvoice', label: 'PI No.' },
  { key: 'amount', label: 'Amount' },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'paymentDate', label: 'Date' },
]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

let searchTimeout: ReturnType<typeof setTimeout>
watch([search, filterFrom, filterTo], () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchPayments(), 300)
})

async function fetchPayments() {
  loading.value = true
  try {
    const params: Record<string, any> = { limit: 50 }
    if (search.value) params.search = search.value
    if (filterFrom.value) params.from = filterFrom.value
    if (filterTo.value) params.to = filterTo.value
    const { data } = await api.get('/supplier-payments', { params })
    payments.value = data.data
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function fetchSuppliers() {
  try {
    const { data } = await api.get('/suppliers', { params: { limit: 100 } })
    suppliers.value = data.data
  } catch { /* ignore */ }
}

async function handleCreate() {
  saving.value = true
  try {
    await api.post('/supplier-payments', {
      ...payForm,
      amount: Number(payForm.amount),
    })
    toast.success('Payment recorded')
    showCreateModal.value = false
    payForm.amount = ''
    payForm.referenceNumber = ''
    payForm.notes = ''
    fetchPayments()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to create payment')
  } finally {
    saving.value = false
  }
}

async function handleDelete(payment: any) {
  if (!confirm(`Delete payment ${payment.paymentNumber}?`)) return
  try {
    await api.delete(`/supplier-payments/${payment.id}`)
    toast.success('Payment deleted')
    fetchPayments()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to delete')
  }
}

onMounted(() => {
  fetchPayments()
  fetchSuppliers()
})
</script>
