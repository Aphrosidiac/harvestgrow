<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Payment Log</h2>
      <div class="flex gap-2">
        <BaseButton variant="secondary" size="md" @click="exportExcel">
          <FileSpreadsheet class="w-4 h-4 mr-1.5" /> Excel
        </BaseButton>
        <BaseButton variant="secondary" size="md" @click="exportPdf">
          <FileText class="w-4 h-4 mr-1.5" /> PDF
        </BaseButton>
        <BaseButton variant="secondary" size="md" @click="printLog">
          <Printer class="w-4 h-4 mr-1.5" /> Print
        </BaseButton>
      </div>
    </div>

    <!-- Method Tabs -->
    <div class="flex items-center gap-1 mb-4 border-b border-stone-200">
      <button
        v-for="mt in methodTabs"
        :key="mt.value"
        @click="switchMethod(mt.value)"
        :class="[
          'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
          activeMethod === mt.value
            ? 'text-green-600 border-green-600'
            : 'text-stone-500 border-transparent hover:text-stone-700',
        ]"
      >
        {{ mt.label }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 mb-4 flex-wrap">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px] max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          v-model="search"
          @input="debouncedFetch"
          type="text"
          placeholder="Search by invoice, customer, plate..."
          class="w-full bg-stone-200 border border-stone-300 rounded-lg pl-10 pr-3 py-2 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
        />
      </div>
      <!-- Date range -->
      <input v-model="dateFrom" type="date" @change="fetchData" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
      <span class="text-stone-500 text-sm">to</span>
      <input v-model="dateTo" type="date" @change="fetchData" class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
    </div>

    <!-- Summary Cards -->
    <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:hidden">
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">Total Collections</p>
        <p class="text-stone-900 text-xl font-bold">RM {{ summary.grandTotal.toFixed(2) }}</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">Transactions</p>
        <p class="text-stone-900 text-xl font-bold">{{ summary.totalPayments }}</p>
      </div>
      <div v-for="(info, method) in summary.byMethod" :key="method" class="bg-white border border-stone-200 rounded-xl p-4">
        <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">{{ fmtMethod(method as string) }}</p>
        <p class="text-stone-900 text-lg font-bold">RM {{ info.total.toFixed(2) }}</p>
        <p class="text-stone-500 text-xs">{{ info.count }} txn{{ info.count > 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- Table -->
    <BaseTable :columns="columns" :data="payments" :loading="loading" empty-text="No payments found." class="print:hidden">
      <template #cell-createdAt="{ value }">
        {{ fmtDateTime(value) }}
      </template>
      <template #cell-documentNumber="{ value }">
        <span class="text-green-600">{{ value }}</span>
      </template>
      <template #cell-customerName="{ row }">
        <div>
          <span class="text-stone-700">{{ row.customerName || '—' }}</span>
          <span v-if="row.vehiclePlate" class="text-stone-500 text-xs ml-2">({{ row.vehiclePlate }})</span>
        </div>
      </template>
      <template #cell-paymentMethod="{ value }">
        <BaseBadge :color="methodColor(value)">{{ fmtMethod(value) }}</BaseBadge>
      </template>
      <template #cell-amount="{ value }">
        <span class="text-green-400 font-medium">RM {{ Number(value).toFixed(2) }}</span>
      </template>
      <template #cell-createdBy="{ value }">
        {{ value || '—' }}
      </template>
    </BaseTable>

    <!-- Pagination -->
    <BasePagination
      :page="page"
      :total="total"
      :limit="limit"
      @update:page="(p) => { page = p; fetchData() }"
      class="print:hidden"
    />

    <!-- Print Template -->
    <div id="payment-log-print" class="hidden print:block text-gray-900" style="width: 800px;">
      <!-- Header -->
      <div class="bg-gray-900 text-white px-8 py-5 flex items-center gap-4">
        <img src="/logo-doc.png" alt="HarvestGrow" class="h-14" />
        <div class="flex-1">
          <h1 class="text-lg font-bold text-yellow-400">HARVEST GROW VEG SDN BHD</h1>
          <p class="text-gray-300 text-xs mt-1">22, Jalan Mutiara Emas 5/1, Taman Mount Austin, 81100 Johor Bahru, Johor</p>
          <p class="text-gray-300 text-xs">Tel: +60 18-207 8080</p>
        </div>
      </div>

      <!-- Title -->
      <div class="bg-white px-8 py-4 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-gray-900 uppercase">Payment Log</h2>
          <div class="text-right text-sm">
            <p><span class="text-gray-500">Period:</span> <strong>{{ fmtDate(dateFrom) }} — {{ fmtDate(dateTo) }}</strong></p>
            <p v-if="activeMethod"><span class="text-gray-500">Method:</span> <strong>{{ fmtMethod(activeMethod) }}</strong></p>
            <p v-if="search"><span class="text-gray-500">Search:</span> <strong>{{ search }}</strong></p>
            <p><span class="text-gray-500">Printed:</span> {{ fmtDate(new Date().toISOString().split('T')[0]) }}</p>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="summary" class="bg-white px-8 py-3 border-b border-gray-200">
        <div class="flex gap-8 text-sm">
          <div>
            <span class="text-gray-500">Total Transactions:</span>
            <strong class="ml-1">{{ summary.totalPayments }}</strong>
          </div>
          <div v-for="(info, method) in summary.byMethod" :key="method">
            <span class="text-gray-500">{{ fmtMethod(method as string) }}:</span>
            <strong class="ml-1">RM {{ info.total.toFixed(2) }} ({{ info.count }})</strong>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white px-8 py-4">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="border-b-2 border-gray-900">
              <th class="text-left py-2 font-semibold" style="width: 28px;">No</th>
              <th class="text-left py-2 font-semibold" style="width: 65px;">Date/Time</th>
              <th class="text-left py-2 font-semibold" style="width: 80px;">Invoice</th>
              <th class="text-left py-2 font-semibold">Customer</th>
              <th class="text-left py-2 font-semibold" style="width: 65px;">Method</th>
              <th class="text-left py-2 font-semibold" style="width: 55px;">Ref</th>
              <th class="text-right py-2 font-semibold" style="width: 75px;">Amount RM</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in allPaymentsForPrint" :key="p.id" class="border-b border-gray-100 align-top">
              <td class="py-1.5">{{ idx + 1 }}</td>
              <td class="py-1.5">{{ fmtDateTime(p.createdAt) }}</td>
              <td class="py-1.5">{{ p.documentNumber }}</td>
              <td class="py-1.5">{{ p.customerName || '—' }}</td>
              <td class="py-1.5">{{ fmtMethod(p.paymentMethod) }}</td>
              <td class="py-1.5">{{ p.referenceNumber || '—' }}</td>
              <td class="py-1.5 text-right font-medium">{{ Number(p.amount).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div v-if="summary" class="bg-white px-8 py-4">
        <div class="flex justify-end">
          <div class="w-56 space-y-1 text-sm">
            <div v-for="(info, method) in summary.byMethod" :key="method" class="flex justify-between">
              <span class="text-gray-500">{{ fmtMethod(method as string) }}</span>
              <span>{{ info.total.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between py-2 border-t-2 border-gray-900 font-bold">
              <span>Grand Total</span>
              <span>RM {{ summary.grandTotal.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Signature -->
      <div class="bg-white px-8 py-6 border-t border-gray-200">
        <div class="grid grid-cols-2 gap-12">
          <div class="text-center">
            <div class="h-16"></div>
            <div class="border-t border-gray-400 pt-2">
              <p class="text-xs font-semibold text-gray-700">PREPARED BY</p>
            </div>
          </div>
          <div class="text-center">
            <div class="h-16"></div>
            <div class="border-t border-gray-400 pt-2">
              <p class="text-xs font-semibold text-gray-700">VERIFIED BY</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-yellow-400 px-8 py-3 text-center border-t border-gray-200">
        <p class="text-gray-800 text-sm font-medium">Harvest Grow Veg Sdn Bhd — Payment Log</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseTable from '../../components/base/BaseTable.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import { Search, Printer, FileSpreadsheet, FileText } from 'lucide-vue-next'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const activeMethod = ref('')
const search = ref('')
const dateFrom = ref(new Date().toISOString().split('T')[0])
const dateTo = ref(new Date().toISOString().split('T')[0])
const loading = ref(true)
const payments = ref<any[]>([])
const allPaymentsForPrint = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const limit = ref(20)
const summary = ref<{
  grandTotal: number
  totalPayments: number
  byMethod: Record<string, { total: number; count: number }>
  dateFrom: string
  dateTo: string
} | null>(null)

const methodTabs = [
  { value: '', label: 'All Methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'EWALLET', label: 'E-Wallet' },
  { value: 'TNG', label: "Touch 'n Go" },
  { value: 'BOOST', label: 'Boost' },
  { value: 'CHEQUE', label: 'Cheque' },
]

const columns = [
  { key: 'createdAt', label: 'Date/Time' },
  { key: 'documentNumber', label: 'Invoice' },
  { key: 'customerName', label: 'Customer' },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'referenceNumber', label: 'Reference' },
  { key: 'amount', label: 'Amount (RM)' },
  { key: 'createdBy', label: 'By' },
]

function fmtMethod(m: string) {
  const labels: Record<string, string> = {
    CASH: 'Cash', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque',
    CREDIT_CARD: 'Credit Card', EWALLET: 'E-Wallet', TNG: "Touch 'n Go", BOOST: 'Boost',
  }
  return labels[m] || m
}

function methodColor(m: string): 'green' | 'blue' | 'gray' | 'gold' {
  if (m === 'CASH') return 'green'
  if (['BANK_TRANSFER', 'CREDIT_CARD'].includes(m)) return 'blue'
  if (['TNG', 'BOOST', 'EWALLET'].includes(m)) return 'gold'
  return 'gray'
}

function fmtDateTime(d: string) {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-MY', { day: '2-digit', month: 'short' }) + ' ' +
    dt.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

function switchMethod(method: string) {
  activeMethod.value = method
  page.value = 1
  fetchData()
}

let debounceTimer: ReturnType<typeof setTimeout>
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; fetchData() }, 300)
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/reports/payment-log', {
      params: {
        page: page.value,
        limit: limit.value,
        from: dateFrom.value || undefined,
        to: dateTo.value || undefined,
        method: activeMethod.value || undefined,
        search: search.value || undefined,
      },
    })
    payments.value = data.data
    total.value = data.total
    summary.value = data.summary
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function printLog() {
  // Fetch all payments (no pagination) for the print view
  try {
    const { data } = await api.get('/reports/payment-log', {
      params: {
        page: 1,
        limit: 9999,
        from: dateFrom.value || undefined,
        to: dateTo.value || undefined,
        method: activeMethod.value || undefined,
        search: search.value || undefined,
      },
    })
    allPaymentsForPrint.value = data.data
  } catch {
    allPaymentsForPrint.value = payments.value
  }
  // Wait for DOM update then print
  await nextTick()
  window.print()
}

async function getAllPayments() {
  try {
    const { data } = await api.get('/reports/payment-log', {
      params: {
        page: 1, limit: 9999,
        from: dateFrom.value || undefined,
        to: dateTo.value || undefined,
        method: activeMethod.value || undefined,
        search: search.value || undefined,
      },
    })
    return data.data as any[]
  } catch {
    return payments.value
  }
}

async function exportExcel() {
  const all = await getAllPayments()
  const rows = all.map((p: any, i: number) => ({
    'No': i + 1,
    'Date/Time': fmtDateTime(p.createdAt),
    'Invoice': p.documentNumber,
    'Customer': p.customerName || '—',
    'Vehicle': p.vehiclePlate || '—',
    'Method': fmtMethod(p.paymentMethod),
    'Reference': p.referenceNumber || '—',
    'Amount (RM)': Number(p.amount).toFixed(2),
  }))

  // Add summary rows
  rows.push({} as any)
  if (summary.value) {
    for (const [method, info] of Object.entries(summary.value.byMethod)) {
      rows.push({ 'No': '' as any, 'Date/Time': '', 'Invoice': '', 'Customer': '', 'Vehicle': '', 'Method': fmtMethod(method), 'Reference': 'Subtotal', 'Amount (RM)': info.total.toFixed(2) })
    }
    rows.push({ 'No': '' as any, 'Date/Time': '', 'Invoice': '', 'Customer': '', 'Vehicle': '', 'Method': '', 'Reference': 'Grand Total', 'Amount (RM)': summary.value.grandTotal.toFixed(2) })
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Payment Log')
  XLSX.writeFile(wb, `payment-log-${dateFrom.value}-to-${dateTo.value}.xlsx`)
}

async function exportPdf() {
  const all = await getAllPayments()
  const doc = new jsPDF()
  const pw = doc.internal.pageSize.width

  // Header bar
  doc.setFillColor(17, 18, 23)
  doc.rect(0, 0, pw, 28, 'F')
  doc.setTextColor(255, 215, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('HARVEST GROW VEG SDN BHD', 14, 12)
  doc.setTextColor(200, 200, 200)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('22, Jalan Mutiara Emas 5/1, Taman Mount Austin, 81100 Johor Bahru, Johor', 14, 18)
  doc.text('Tel: +60 18-207 8080', 14, 23)

  // Title + filters
  doc.setTextColor(0)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT LOG', 14, 38)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  const filterParts = [`Period: ${fmtDate(dateFrom.value)} — ${fmtDate(dateTo.value)}`]
  if (activeMethod.value) filterParts.push(`Method: ${fmtMethod(activeMethod.value)}`)
  if (search.value) filterParts.push(`Search: ${search.value}`)
  doc.text(filterParts.join('  |  '), 14, 44)
  doc.text(`Printed: ${fmtDate(new Date().toISOString().split('T')[0])}`, pw - 14, 44, { align: 'right' })

  // Summary line
  if (summary.value) {
    doc.setTextColor(0)
    const summaryParts = [`Transactions: ${summary.value.totalPayments}`]
    for (const [method, info] of Object.entries(summary.value.byMethod)) {
      summaryParts.push(`${fmtMethod(method)}: RM ${info.total.toFixed(2)} (${info.count})`)
    }
    doc.text(summaryParts.join('   |   '), 14, 50)
  }

  // Table
  const rows = all.map((p: any, i: number) => [
    i + 1,
    fmtDateTime(p.createdAt),
    p.documentNumber,
    p.customerName || '—',
    fmtMethod(p.paymentMethod),
    p.referenceNumber || '—',
    Number(p.amount).toFixed(2),
  ])

  autoTable(doc, {
    startY: 56,
    head: [['No', 'Date/Time', 'Invoice', 'Customer', 'Method', 'Ref', 'Amount (RM)']],
    body: rows,
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: [17, 18, 23], textColor: [255, 215, 0], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 6: { halign: 'right' } },
  })

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || 200
  if (summary.value) {
    let y = finalY + 6
    doc.setFontSize(8)
    for (const [method, info] of Object.entries(summary.value.byMethod)) {
      doc.setTextColor(100)
      doc.text(fmtMethod(method), pw - 70, y)
      doc.setTextColor(0)
      doc.text(`RM ${info.total.toFixed(2)}`, pw - 14, y, { align: 'right' })
      y += 5
    }
    doc.setDrawColor(17, 18, 23)
    doc.setLineWidth(0.5)
    doc.line(pw - 70, y, pw - 14, y)
    y += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Grand Total', pw - 70, y)
    doc.text(`RM ${summary.value.grandTotal.toFixed(2)}`, pw - 14, y, { align: 'right' })
    y += 12

    // Signature lines
    const sigY = y + 20
    doc.setDrawColor(150)
    doc.setLineWidth(0.3)
    doc.line(14, sigY, 80, sigY)
    doc.line(pw - 80, sigY, pw - 14, sigY)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80)
    doc.text('PREPARED BY', 47, sigY + 5, { align: 'center' })
    doc.text('VERIFIED BY', pw - 47, sigY + 5, { align: 'center' })
  }

  // Footer bar
  const ph = doc.internal.pageSize.height
  doc.setFillColor(255, 215, 0)
  doc.rect(0, ph - 12, pw, 12, 'F')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Harvest Grow Veg Sdn Bhd — Payment Log', pw / 2, ph - 5, { align: 'center' })

  doc.save(`payment-log-${dateFrom.value}-to-${dateTo.value}.pdf`)
}

onMounted(() => fetchData())
onUnmounted(() => clearTimeout(debounceTimer))
</script>

<style>
@media print {
  body * { visibility: hidden; }
  #payment-log-print, #payment-log-print * {
    visibility: visible;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #payment-log-print {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    max-width: 100%;
  }
}
</style>
