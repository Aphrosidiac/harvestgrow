<template>
  <div>
    <!-- Action Bar -->
    <div class="flex items-center justify-between mb-6 print:hidden">
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="text-stone-500 hover:text-stone-700 transition-colors">
          <ArrowLeft class="w-5 h-5" />
        </button>
        <h2 class="text-lg font-semibold text-stone-900">{{ doc?.documentNumber }}</h2>
        <BaseBadge v-if="doc" :color="store.getStatusColor(doc.status) as any">{{ doc.status }}</BaseBadge>
      </div>
      <div v-if="doc" class="flex items-center gap-2">
        <!-- Status Actions -->
        <template v-if="doc.documentType === 'INVOICE'">
          <BaseButton v-if="doc.status === 'DRAFT'" variant="primary" size="sm" @click="handleStatus('OUTSTANDING')" :loading="statusLoading">
            <Send class="w-4 h-4 mr-1" /> Issue Invoice
          </BaseButton>
          <BaseButton v-if="['OUTSTANDING', 'PARTIAL'].includes(doc.status)" variant="primary" size="sm" @click="showPaymentModal = true">
            <CreditCard class="w-4 h-4 mr-1" /> Record Payment
          </BaseButton>
          <BaseButton v-if="doc.status === 'OUTSTANDING'" variant="secondary" size="sm" @click="handleRevertDraft" :loading="statusLoading">
            <RotateCcw class="w-4 h-4 mr-1" /> Revert to Draft
          </BaseButton>
          <BaseButton v-if="['PARTIAL', 'PAID'].includes(doc.status) && auth.isAdmin" variant="secondary" size="sm" @click="handleRevertPaidDraft" :loading="statusLoading">
            <RotateCcw class="w-4 h-4 mr-1" /> Revert to Draft
          </BaseButton>
          <BaseButton v-if="doc.status !== 'VOID' && doc.status !== 'DRAFT'" variant="danger" size="sm" @click="handleStatus('VOID')" :loading="statusLoading">
            Void
          </BaseButton>
        </template>
        <template v-if="doc.documentType === 'QUOTATION'">
          <BaseButton v-if="doc.status === 'DRAFT'" variant="primary" size="sm" @click="handleStatus('APPROVED')">Approve</BaseButton>
          <BaseButton v-if="doc.status === 'APPROVED'" variant="secondary" size="sm" @click="handleStatus('SENT')">Mark as Sent</BaseButton>
        </template>
        <template v-if="doc.documentType === 'DELIVERY_ORDER'">
          <BaseButton v-if="doc.status === 'DRAFT'" variant="primary" size="sm" @click="handleStatus('APPROVED')">Approve</BaseButton>
          <BaseButton v-if="doc.status === 'APPROVED'" variant="primary" size="sm" @click="handleStatus('COMPLETED')">Mark Delivered</BaseButton>
          <BaseButton v-if="doc.status === 'COMPLETED'" variant="secondary" size="sm" @click="handleRevertDraft" :loading="statusLoading">
            <RotateCcw class="w-4 h-4 mr-1" /> Revert to Draft
          </BaseButton>
        </template>

        <!-- Convert -->
        <BaseButton
          v-for="target in (doc.conversionTargets || [])"
          :key="target"
          variant="secondary" size="sm"
          @click="handleConvert(target)"
          :loading="converting"
        >
          <ArrowRightLeft class="w-4 h-4 mr-1" /> Convert to {{ store.getDocTypeLabel(target) }}
        </BaseButton>

        <!-- Edit -->
        <RouterLink v-if="['DRAFT', 'PENDING'].includes(doc.status)" :to="`/app/documents/${doc.id}/edit`">
          <BaseButton variant="secondary" size="sm"><Pencil class="w-4 h-4 mr-1" /> Edit</BaseButton>
        </RouterLink>

        <!-- Export -->
        <BaseButton variant="secondary" size="sm" @click="exportAsImage" :loading="exporting">
          <Download class="w-4 h-4 mr-1" /> Export PNG
        </BaseButton>
        <BaseButton variant="secondary" size="sm" @click="handlePrint">
          <Printer class="w-4 h-4 mr-1" /> Print
        </BaseButton>
      </div>
    </div>

    <!-- Conversion Lineage -->
    <div v-if="doc?.convertedFromId" class="bg-white border border-stone-200 rounded-xl p-4 mb-4 flex items-center gap-2 text-sm print:hidden">
      <GitBranch class="w-4 h-4 text-green-600" />
      <span class="text-stone-500">Converted from</span>
      <RouterLink :to="`/app/documents/${doc.convertedFromId}`" class="text-green-600 hover:text-green-500 font-mono">
        {{ doc.convertedFromType }}
      </RouterLink>
    </div>

    <div v-if="loadingDoc" class="text-stone-500">Loading...</div>

    <!-- Document Template — Clean White Professional -->
    <div v-else-if="doc" id="document-template" class="bg-white text-gray-900 overflow-hidden max-w-3xl mx-auto border border-gray-300 print:max-w-full print:shadow-none print:border-none" style="width: 800px;">
      <!-- Header: Logo + Company Info -->
      <div class="px-8 pt-6 pb-4 flex items-start justify-between">
        <img src="/logo-invoice.png" alt="HarvestGrow" class="h-16" />
        <div class="text-right text-xs text-gray-700">
          <p class="text-sm font-bold text-gray-900">{{ branch?.name || 'HARVEST GROW VEG SDN BHD' }}</p>
          <p v-if="branch?.ssmNumber" class="text-gray-500">({{ branch.ssmNumber }})</p>
          <p class="mt-1">{{ branch?.address || '' }}</p>
          <p v-if="branch?.phone">Tel: {{ branch.phone }}</p>
          <p v-if="branch?.email">{{ branch.email }}</p>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t-2 border-gray-900 mx-8"></div>

      <!-- Doc Type + Number/Date + Customer/Vehicle -->
      <div class="px-8 py-4">
        <div class="flex justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900 uppercase">{{ store.getDocTypeLabel(doc.documentType) }}</h2>
          <div class="text-right text-sm space-y-0.5">
            <p><span class="text-gray-500">No:</span> <strong>{{ doc.documentNumber }}</strong></p>
            <p><span class="text-gray-500">Date:</span> {{ fmtDate(doc.issueDate) }}</p>
            <p v-if="doc.dueDate"><span class="text-gray-500">Due:</span> {{ fmtDate(doc.dueDate) }}</p>
          </div>
        </div>
        <div v-if="doc.customerName || doc.vehiclePlate" class="grid grid-cols-2 gap-6 text-sm border-t border-gray-200 pt-3">
          <div>
            <p class="text-gray-500 text-xs uppercase font-semibold mb-1">Sold To</p>
            <p class="font-medium">{{ doc.customerName || '—' }}</p>
            <p v-if="doc.customerCompanyName" class="text-gray-600 text-xs mt-0.5">{{ doc.customerCompanyName }}</p>
            <p v-if="doc.customerPhone" class="text-gray-500 text-xs mt-0.5">Tel: {{ doc.customerPhone }}</p>
            <p v-if="doc.customerEmail" class="text-gray-500 text-xs">{{ doc.customerEmail }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs uppercase font-semibold mb-1">Vehicle</p>
            <p v-if="doc.vehiclePlate" class="font-medium">{{ doc.vehiclePlate }}</p>
            <p v-if="doc.vehicleModel" class="text-gray-500 text-xs mt-0.5">Make & Model: {{ doc.vehicleModel }}</p>
            <p v-if="doc.vehicleColor" class="text-gray-500 text-xs">Color: {{ doc.vehicleColor }}</p>
            <p v-if="doc.vehicleMileage" class="text-gray-500 text-xs">Mileage: {{ doc.vehicleMileage }} KM</p>
            <p v-if="doc.vehicleEngineNo" class="text-gray-500 text-xs">Engine No: {{ doc.vehicleEngineNo }}</p>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="px-8 py-2">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-t border-b border-gray-900">
              <th class="text-left py-2 font-semibold w-8">No</th>
              <th class="text-left py-2 font-semibold">Description / Part No</th>
              <th class="text-center py-2 font-semibold w-12">Qty</th>
              <th class="text-left py-2 font-semibold w-12">UOM</th>
              <th v-if="!isDeliveryOrder" class="text-right py-2 font-semibold w-20">Price RM</th>
              <th v-if="hasDiscount && !isDeliveryOrder" class="text-right py-2 font-semibold w-12">Disc%</th>
              <th v-if="hasTax && !isDeliveryOrder" class="text-right py-2 font-semibold w-12">Tax%</th>
              <th v-if="!isDeliveryOrder" class="text-right py-2 font-semibold w-24">Amount RM</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in doc.items" :key="item.id" class="border-b border-gray-200">
              <td class="py-2">{{ idx + 1 }}</td>
              <td class="py-2" style="white-space: pre-line;">
                <span v-if="item.itemCode" class="font-mono text-gray-500 text-xs">{{ item.itemCode }} </span>
                {{ item.description }}
                <span v-if="item.serviceDate" class="block text-gray-400 text-xs mt-0.5">Service: {{ fmtDate(item.serviceDate) }}</span>
              </td>
              <td class="py-2 text-center">{{ item.quantity }}</td>
              <td class="py-2">{{ item.unit }}</td>
              <td v-if="!isDeliveryOrder" class="py-2 text-right">{{ Number(item.unitPrice).toFixed(2) }}</td>
              <td v-if="hasDiscount && !isDeliveryOrder" class="py-2 text-right">{{ Number(item.discountPercent) > 0 ? Number(item.discountPercent).toFixed(1) : '' }}</td>
              <td v-if="hasTax && !isDeliveryOrder" class="py-2 text-right">{{ Number(item.taxRate) > 0 ? Number(item.taxRate).toFixed(1) : '' }}</td>
              <td v-if="!isDeliveryOrder" class="py-2 text-right font-medium">{{ Number(item.total).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Amount in Words + Totals + T&C -->
      <div class="px-8 py-4">
        <div class="border-t border-gray-900"></div>
        <p v-if="!isDeliveryOrder" class="text-xs text-gray-600 font-medium mt-3 mb-3">{{ amountInWords }}</p>
        <div class="flex justify-between items-start">
          <!-- T&C + Notes (left) -->
          <div class="text-xs text-gray-600 max-w-[55%] space-y-3">
            <div v-if="doc.notes" class="whitespace-pre-line">{{ doc.notes }}</div>
            <div class="leading-relaxed">
              <p class="font-bold text-gray-800">1. ALL GOODS SOLD ARE NOT RETURNABLE. RM50.00 (1PC) WILL BE CHARGE FOR CANCELLATION.</p>
              <p class="font-bold text-gray-800">2. ALL CHEQUES SHOULD BE CROSSED AND MADE PAYABLE TO:</p>
              <p class="ml-3 font-bold text-gray-800">HARVEST GROW VEG SDN BHD</p>
              <p class="font-bold text-gray-900 mt-1">PUBLIC BANK A/C : 3228 486 517</p>
            </div>
          </div>
          <!-- Totals (right) -->
          <div v-if="!isDeliveryOrder" class="w-56 space-y-1 text-sm">
            <div class="flex justify-between border border-gray-400 px-3 py-1.5"><span class="text-gray-600">SubTotal</span><span>{{ Number(doc.subtotal).toFixed(2) }}</span></div>
            <div v-if="Number(doc.taxAmount) > 0" class="flex justify-between border border-gray-400 px-3 py-1.5"><span class="text-gray-600">Tax</span><span>{{ Number(doc.taxAmount).toFixed(2) }}</span></div>
            <div v-if="Number(doc.discountAmount) > 0" class="flex justify-between border border-gray-400 px-3 py-1.5"><span class="text-gray-600">Discount</span><span class="text-red-600">-{{ Number(doc.discountAmount).toFixed(2) }}</span></div>
            <div class="flex justify-between border-2 border-gray-900 px-3 py-1.5 font-bold">
              <span>Total</span><span>{{ Number(doc.totalAmount).toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Status (for invoices) -->
      <div v-if="doc.documentType === 'INVOICE'" class="px-8 py-3">
        <div class="flex items-center justify-between text-xs border border-gray-400">
          <div class="flex items-center border-r border-gray-400">
            <span :class="['px-3 py-1.5 font-bold border-r border-gray-400', Number(doc.paidAmount) >= Number(doc.totalAmount) ? 'bg-gray-900 text-white' : '']">PAID</span>
            <span class="px-3 py-1.5">CASH / Transfer / Cheque / Credit Card</span>
          </div>
          <div class="flex items-center">
            <span :class="['px-3 py-1.5 font-bold border-l border-gray-400', Number(doc.paidAmount) < Number(doc.totalAmount) ? 'bg-gray-900 text-white' : '']">UNPAID</span>
            <span class="px-3 py-1.5 border-l border-gray-400">TNG / BOOST</span>
          </div>
        </div>
      </div>

      <!-- Signature Section: Stamp + E&O.E. + Recipient -->
      <div class="px-8 py-6">
        <p v-if="doc.documentType === 'INVOICE'" class="text-xs font-bold text-gray-700 text-right mb-2">RECIPIENT'S SIGNATURE</p>
        <div class="grid grid-cols-3 gap-6 items-end">
          <!-- Left: Signature line -->
          <div>
            <div class="h-12 border-b border-gray-400 mb-3"></div>
            <p class="text-xs font-bold text-gray-700 text-center">AUTHORISED SIGNATORY</p>
          </div>
          <!-- Center: E&O.E. + page -->
          <div class="text-center">
            <p class="text-xs font-semibold text-gray-700">E & O.E.</p>
            <p class="text-xs text-gray-500 mt-1">1/1</p>
          </div>
          <!-- Right: Name + IC -->
          <div>
            <div class="h-12 border-b border-gray-400 mb-3"></div>
            <div class="space-y-2 text-xs text-gray-700">
              <p><strong>NAME</strong> : ________________________________</p>
              <p><strong>I/C NO.</strong> : ________________________________</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Terms (only if custom terms set) -->
      <div v-if="doc.terms" class="px-8 py-3 border-t border-gray-200">
        <p class="text-xs text-gray-500 whitespace-pre-line">{{ doc.terms }}</p>
      </div>
    </div>

    <!-- Payment History (below template) -->
    <div v-if="doc?.payments?.length" class="mt-6 max-w-3xl mx-auto print:hidden">
      <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">Payment History</h3>
      <div class="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200">
        <div v-for="p in doc.payments" :key="p.id" class="px-4 py-3 flex items-center justify-between">
          <div>
            <span class="text-stone-700 text-sm">{{ fmtPaymentMethod(p.paymentMethod) }}</span>
            <span v-if="p.referenceNumber" class="text-stone-500 text-xs ml-2">#{{ p.referenceNumber }}</span>
            <span v-if="p.bankName" class="text-stone-500 text-xs ml-2">({{ p.bankName }})</span>
            <p v-if="p.notes" class="text-stone-500 text-xs mt-0.5">{{ p.notes }}</p>
          </div>
          <div class="text-right">
            <span class="text-green-400 font-medium">RM {{ Number(p.amount).toFixed(2) }}</span>
            <p class="text-stone-500 text-xs">{{ fmtDate(p.createdAt) }} by {{ p.createdBy?.name }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <BaseModal v-model="showPaymentModal" title="Record Payment" size="md">
      <div class="space-y-4">
        <BaseInput v-model="paymentForm.amount" label="Amount (RM)" type="number" step="0.01" min="0.01" required />
        <BaseSelect v-model="paymentForm.paymentMethod" label="Payment Method" required>
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="CHEQUE">Cheque</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="EWALLET">E-Wallet</option>
          <option value="TNG">Touch 'n Go</option>
          <option value="BOOST">Boost</option>
        </BaseSelect>
        <BaseInput v-model="paymentForm.referenceNumber" label="Reference Number" placeholder="Optional" />
        <BaseInput v-model="paymentForm.bankName" label="Bank Name" placeholder="Optional" />
        <BaseInput v-model="paymentForm.notes" label="Notes" placeholder="Optional" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showPaymentModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="paymentLoading" @click="handlePayment">Record Payment</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useDocumentStore } from '../../stores/documents'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import { domToPng } from 'modern-screenshot'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseSelect from '../../components/base/BaseSelect.vue'
import {
  ArrowLeft, Send, CreditCard, Download, Printer, Pencil,
  ArrowRightLeft, GitBranch, RotateCcw,
} from 'lucide-vue-next'
import type { Document, DocumentType, DocumentStatus } from '../../types'

const route = useRoute()
const router = useRouter()
const store = useDocumentStore()
const auth = useAuthStore()
const toast = useToast()

const doc = ref<Document | null>(null)
const branch = ref<any>(null)
const loadingDoc = ref(true)
const statusLoading = ref(false)
const converting = ref(false)
const exporting = ref(false)
const showPaymentModal = ref(false)
const paymentLoading = ref(false)

const paymentForm = reactive({
  amount: '',
  paymentMethod: 'CASH',
  referenceNumber: '',
  bankName: '',
  notes: '',
})

const isDeliveryOrder = computed(() => doc.value?.documentType === 'DELIVERY_ORDER')
const hasDiscount = computed(() => doc.value?.items?.some((i) => Number(i.discountPercent) > 0))
const hasTax = computed(() => doc.value?.items?.some((i) => Number(i.taxRate) > 0))

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY')
}

// @ts-expect-error unused but retained for template reference
const paymentMethods = ['Cash', 'Transfer', 'Cheque', 'Credit Card', 'TNG', 'Boost']

// @ts-expect-error unused but retained for template reference
function isMethodUsed(method: string): boolean {
  if (!doc.value?.payments) return false
  const map: Record<string, string[]> = {
    'Cash': ['CASH'],
    'Transfer': ['BANK_TRANSFER'],
    'Cheque': ['CHEQUE'],
    'Credit Card': ['CREDIT_CARD'],
    'TNG': ['TNG'],
    'Boost': ['BOOST'],
  }
  return doc.value.payments.some((p) => (map[method] || []).includes(p.paymentMethod))
}

const amountInWords = computed(() => {
  if (!doc.value) return ''
  return 'RINGGIT MALAYSIA ' + numberToWords(Number(doc.value.totalAmount)) + ' ONLY'
})

function numberToWords(n: number): string {
  if (n === 0) return 'ZERO'
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

  const whole = Math.floor(n)
  const cents = Math.round((n - whole) * 100)

  function convert(num: number): string {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
    if (num < 1000) return ones[Math.floor(num / 100)] + ' HUNDRED' + (num % 100 ? ' AND ' + convert(num % 100) : '')
    if (num < 1000000) return convert(Math.floor(num / 1000)) + ' THOUSAND' + (num % 1000 ? ' ' + convert(num % 1000) : '')
    return convert(Math.floor(num / 1000000)) + ' MILLION' + (num % 1000000 ? ' ' + convert(num % 1000000) : '')
  }

  let result = convert(whole)
  if (cents > 0) result += ' AND ' + convert(cents) + ' CENTS'
  return result
}

function fmtPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Cash',
    BANK_TRANSFER: 'Bank Transfer',
    CHEQUE: 'Cheque',
    CREDIT_CARD: 'Credit Card',
    EWALLET: 'E-Wallet',
    TNG: 'Touch \'n Go',
    BOOST: 'Boost',
  }
  return labels[method] || method
}

async function loadDocument() {
  loadingDoc.value = true
  try {
    const [docData, profileData] = await Promise.all([
      store.getDocument(route.params.id as string),
      api.get('/profile'),
    ])
    doc.value = docData
    branch.value = profileData.data.data.branch
  } catch {
    toast.error('Failed to load document')
    router.push('/app/documents')
  } finally {
    loadingDoc.value = false
  }
}

async function handleStatus(status: DocumentStatus) {
  if (!doc.value) return
  if (status === 'VOID' && !confirm('Are you sure you want to void this document? Stock will be restored.')) return
  statusLoading.value = true
  try {
    doc.value = await store.updateStatus(doc.value.id, status)
    // Re-fetch to get updated conversionTargets
    doc.value = await store.getDocument(doc.value.id)
    toast.success(`Status updated to ${status}`)
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to update status')
  } finally {
    statusLoading.value = false
  }
}

async function handleRevertDraft() {
  if (!doc.value) return
  if (!confirm('Are you sure you want to revert this document to DRAFT? Stock changes will be reversed.')) return
  await handleStatus('DRAFT')
}

async function handleRevertPaidDraft() {
  if (!doc.value) return
  if (!confirm('WARNING: This will DELETE all payment records and revert the invoice to DRAFT. Stock will be restored. Are you sure?')) return
  await handleStatus('DRAFT')
}

async function handleConvert(targetType: DocumentType) {
  if (!doc.value) return
  converting.value = true
  try {
    const newDoc = await store.convertDocument(doc.value.id, targetType)
    toast.success(`Converted to ${newDoc.documentNumber}`)
    router.push(`/app/documents/${newDoc.id}`)
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Conversion failed')
  } finally {
    converting.value = false
  }
}

async function handlePayment() {
  if (!doc.value || !paymentForm.amount) return
  paymentLoading.value = true
  try {
    doc.value = await store.addPayment(doc.value.id, {
      amount: parseFloat(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod as any,
      referenceNumber: paymentForm.referenceNumber || undefined,
      bankName: paymentForm.bankName || undefined,
      notes: paymentForm.notes || undefined,
    })
    // Re-fetch for conversionTargets
    doc.value = await store.getDocument(doc.value.id)
    toast.success('Payment recorded')
    showPaymentModal.value = false
    paymentForm.amount = ''
    paymentForm.referenceNumber = ''
    paymentForm.bankName = ''
    paymentForm.notes = ''
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to record payment')
  } finally {
    paymentLoading.value = false
  }
}

function handlePrint() {
  window.print()
}

async function exportAsImage() {
  exporting.value = true
  const el = document.getElementById('document-template')
  if (!el) {
    toast.error('Document template not found')
    exporting.value = false
    return
  }
  try {
    el.classList.remove('rounded-xl')
    // Force browser repaint before capture
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

    const dataUrl = await domToPng(el, {
      scale: 2,
      width: el.offsetWidth,
      height: el.scrollHeight,
      style: {
        margin: '0',
        padding: '0',
        borderRadius: '0',
      },
    })

    el.classList.add('rounded-xl')

    const link = document.createElement('a')
    link.download = `${doc.value?.documentNumber || 'document'}.png`
    link.href = dataUrl
    link.click()
    toast.success('Document exported as PNG')
  } catch (err: any) {
    el.classList.add('rounded-xl')
    console.error('Export error:', err)
    toast.error('Export failed: ' + (err?.message || 'Unknown error'))
  } finally {
    exporting.value = false
  }
}

onMounted(() => loadDocument())
</script>

<style>
@media print {
  body * { visibility: hidden; }
  #document-template, #document-template * { visibility: visible; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #document-template { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; }
}
</style>
