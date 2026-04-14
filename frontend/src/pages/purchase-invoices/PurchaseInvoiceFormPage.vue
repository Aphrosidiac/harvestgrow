<template>
  <div class="max-w-4xl">
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-stone-500 hover:text-stone-700 transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold text-stone-900">{{ isEdit ? 'Edit Purchase Invoice' : 'New Purchase Invoice' }}</h2>
    </div>

    <form @submit.prevent="handleSave" class="space-y-6">
      <!-- Supplier & Invoice Info -->
      <div class="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Invoice Details</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          <BaseSelect v-model="form.supplierId" label="Supplier" required>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.companyName }}</option>
          </BaseSelect>
          <BaseInput v-model="form.invoiceNumber" label="Supplier Invoice No." placeholder="e.g. INV-12345" required />
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <BaseInput v-model="form.issueDate" label="Invoice Date" type="date" />
          <BaseInput v-model="form.receivedDate" label="Received Date" type="date" />
        </div>
        <BaseInput v-model="form.notes" label="Notes" placeholder="Optional notes" />
      </div>

      <!-- Items -->
      <div class="bg-white border border-stone-200 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Items</h3>
          <BaseButton variant="secondary" size="sm" type="button" @click="addItem">
            <Plus class="w-4 h-4 mr-1" /> Add Item
          </BaseButton>
        </div>

        <div class="space-y-3">
          <div v-for="(item, idx) in form.items" :key="idx" class="grid grid-cols-12 gap-2 items-end bg-stone-200/30 rounded-lg p-3">
            <div class="col-span-4">
              <BaseInput v-model="item.description" label="Description" placeholder="Item description" required />
            </div>
            <div class="col-span-2">
              <BaseInput v-model="item.itemCode" label="Item Code" placeholder="Code" />
            </div>
            <div class="col-span-1">
              <BaseInput v-model="item.quantity" label="Qty" type="number" min="1" />
            </div>
            <div class="col-span-3">
              <BaseInput v-model="item.unitPrice" label="Unit Price" type="number" step="0.01" min="0" />
            </div>
            <div class="col-span-1 flex justify-center">
              <button type="button" @click="removeItem(idx)" class="p-2 text-stone-500 hover:text-red-400 transition-colors mt-5">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Total -->
        <div class="flex justify-end mt-4 text-sm">
          <div class="w-48">
            <div class="flex justify-between py-2 border-t border-stone-300 font-bold text-stone-900">
              <span>Total</span>
              <span>RM {{ calculatedTotal.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <BaseButton variant="secondary" type="button" @click="$router.back()">Cancel</BaseButton>
        <BaseButton variant="primary" type="submit" :loading="saving">{{ isEdit ? 'Update' : 'Create' }}</BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import { ArrowLeft, Plus, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const isEdit = computed(() => !!route.params.id)
const saving = ref(false)
const suppliers = ref<any[]>([])

const form = reactive({
  supplierId: '',
  invoiceNumber: '',
  issueDate: new Date().toISOString().split('T')[0],
  receivedDate: '',
  notes: '',
  items: [{ description: '', itemCode: '', quantity: 1, unitPrice: 0 }] as any[],
})

const calculatedTotal = computed(() =>
  form.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0)
)

function addItem() {
  form.items.push({ description: '', itemCode: '', quantity: 1, unitPrice: 0 })
}

function removeItem(idx: number) {
  if (form.items.length > 1) form.items.splice(idx, 1)
}

async function loadSuppliers() {
  try {
    const { data } = await api.get('/suppliers', { params: { limit: 100 } })
    suppliers.value = data.data
  } catch { /* ignore */ }
}

async function loadInvoice() {
  if (!route.params.id) return
  try {
    const { data } = await api.get(`/purchase-invoices/${route.params.id}`)
    const pi = data.data
    form.supplierId = pi.supplierId
    form.invoiceNumber = pi.invoiceNumber
    form.issueDate = pi.issueDate?.split('T')[0] || ''
    form.receivedDate = pi.receivedDate?.split('T')[0] || ''
    form.notes = pi.notes || ''
    form.items = pi.items?.map((i: any) => ({
      description: i.description,
      itemCode: i.itemCode || '',
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      stockItemId: i.stockItemId || '',
    })) || []
  } catch {
    toast.error('Failed to load purchase invoice')
    router.push('/app/purchase-invoices')
  }
}

async function handleSave() {
  if (!form.supplierId || !form.invoiceNumber) {
    toast.error('Supplier and invoice number are required')
    return
  }
  saving.value = true
  try {
    const payload = {
      ...form,
      items: form.items.map((item: any, idx: number) => ({
        ...item,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        sortOrder: idx,
      })),
    }
    if (isEdit.value) {
      await api.put(`/purchase-invoices/${route.params.id}`, payload)
      toast.success('Purchase invoice updated')
    } else {
      const { data } = await api.post('/purchase-invoices', payload)
      toast.success('Purchase invoice created')
      router.push(`/app/purchase-invoices/${data.data.id}`)
      return
    }
    router.push('/app/purchase-invoices')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSuppliers()
  loadInvoice()
})
</script>
