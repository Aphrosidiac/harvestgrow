<template>
  <div>
    <!-- Upload Section -->
    <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
      <h3 class="text-sm font-semibold text-stone-500 uppercase mb-4">Upload Supplier Quotations</h3>

      <div
        class="border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer"
        :class="isDragging ? 'border-green-500 bg-green-50' : 'border-stone-300 hover:border-green-400'"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
        @click="($refs.fileInput as HTMLInputElement)?.click()"
      >
        <Upload class="w-10 h-10 text-stone-400 mx-auto mb-3" />
        <p class="text-stone-600 text-sm">Drag & drop PDF or image quotations here, or <span class="text-green-600 font-medium">click to browse</span></p>
        <p class="text-stone-400 text-xs mt-1">Upload 2-10 PDF or image files from different suppliers</p>
        <input ref="fileInput" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" class="hidden" @change="handleFileSelect" />
      </div>

      <!-- File list -->
      <div v-if="files.length" class="mt-4 space-y-2">
        <div v-for="(file, idx) in files" :key="idx" class="flex items-center gap-3 bg-stone-100 rounded-lg px-4 py-2.5">
          <FileText v-if="file.type === 'application/pdf'" class="w-5 h-5 text-red-500 shrink-0" />
          <ImageIcon v-else class="w-5 h-5 text-blue-500 shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-sm text-stone-900 font-medium truncate">{{ file.name }}</p>
            <p class="text-xs text-stone-400">{{ (file.size / 1024).toFixed(0) }} KB</p>
          </div>
          <button @click="files.splice(idx, 1)" class="text-stone-400 hover:text-red-500 transition-colors">
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between mt-4">
        <p v-if="files.length" class="text-sm text-stone-500">{{ files.length }} file(s) selected</p>
        <div v-else />
        <BaseButton variant="secondary" size="sm" @click="downloadDemos">
          <Download class="w-4 h-4 mr-1.5" /> Download Demo PDFs
        </BaseButton>
        <BaseButton variant="primary" :loading="analyzing" :disabled="files.length < 2" @click="analyze">
          <Sparkles class="w-4 h-4 mr-1.5" /> Compare Quotations
        </BaseButton>
      </div>

      <!-- Progress -->
      <div v-if="analyzing" class="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center gap-3">
          <div class="animate-spin w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full" />
          <p class="text-sm text-green-700 font-medium">{{ progressText }}</p>
        </div>
      </div>
    </div>

    <!-- History -->
    <div v-if="history.length" class="bg-white border border-stone-200 rounded-xl p-5 mb-6">
      <h3 class="text-sm font-semibold text-stone-500 uppercase mb-3">Recent Comparisons</h3>
      <div class="space-y-2">
        <div v-for="h in history" :key="h.id" class="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
          <div class="flex-1 min-w-0">
            <p class="text-sm text-stone-900">
              {{ (h.suppliers as string[]).map((s: string) => shortName(s)).join(' vs ') }}
            </p>
            <p class="text-xs text-stone-400 mt-0.5">{{ fmtDate(h.createdAt) }}{{ h.createdBy?.name ? ' · ' + h.createdBy.name : '' }}</p>
          </div>
          <BaseButton variant="ghost" size="sm" @click="loadComparison(h)">View</BaseButton>
        </div>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="result">
      <!-- Summary -->
      <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <div class="flex items-start gap-3">
          <Sparkles class="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <h3 class="text-sm font-semibold text-stone-900 mb-2">AI Recommendation</h3>
            <p class="text-sm text-stone-700 leading-relaxed whitespace-pre-line">{{ cleanMarkdown(result.summary) }}</p>
          </div>
        </div>
      </div>

      <!-- Comparison Table -->
      <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
        <table class="w-full text-xs text-left">
          <thead class="text-[10px] text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
            <tr>
              <th class="px-3 py-2 font-medium">Product</th>
              <th class="px-2 py-2 font-medium w-10">Unit</th>
              <th v-for="s in result.suppliers" :key="s" class="px-2 py-2 font-medium text-right max-w-[100px]" :title="s">{{ shortName(s) }}</th>
              <th class="px-2 py-2 font-medium text-center w-24">Best</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <tr v-for="item in result.items" :key="item.product" class="hover:bg-stone-200/30 transition-colors">
              <td class="px-3 py-1.5 text-stone-900 font-medium whitespace-nowrap">{{ item.product }}</td>
              <td class="px-2 py-1.5 text-stone-400">{{ item.unit }}</td>
              <td v-for="s in result.suppliers" :key="s" class="px-2 py-1.5 text-right tabular-nums whitespace-nowrap"
                :class="getPriceClass(item, s)"
              >
                {{ item.prices[s] != null ? Number(item.prices[s]).toFixed(2) : '-' }}
              </td>
              <td class="px-2 py-1.5 text-center">
                <span class="text-green-600 text-[10px] font-medium truncate block" :title="item.cheapest">{{ shortName(item.cheapest) }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-stone-100 border-t-2 border-stone-300">
            <tr class="font-semibold text-xs">
              <td class="px-3 py-2 text-stone-900">TOTAL</td>
              <td class="px-2 py-2" />
              <td v-for="s in result.suppliers" :key="s" class="px-2 py-2 text-right tabular-nums"
                :class="getSupplierTotal(s) === cheapestTotal ? 'text-green-600' : 'text-stone-900'"
              >
                RM {{ getSupplierTotal(s).toFixed(2) }}
              </td>
              <td class="px-2 py-2 text-center">
                <span class="text-green-600 text-[10px] font-medium">{{ shortName(cheapestSupplier) }}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="flex items-center justify-between mt-3">
        <p class="text-xs text-stone-400">
          {{ result.items.length }} products compared across {{ result.suppliers.length }} suppliers
        </p>
        <BaseButton variant="secondary" size="sm" @click="exportToExcel">
          <Download class="w-4 h-4 mr-1.5" /> Export Excel
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import { Upload, FileText, X, Sparkles, Download, ImageIcon } from 'lucide-vue-next'
import * as XLSX from 'xlsx'

const toast = useToast()

const files = ref<File[]>([])
const isDragging = ref(false)
const analyzing = ref(false)
const progressText = ref('')
const result = ref<any>(null)
const history = ref<any[]>([])
const loadingHistory = ref(false)

const demoFiles = [
  '/supplier-a-cameron-fresh.pdf',
  '/supplier-b-jb-veggie.pdf',
  '/supplier-c-senai-green.pdf',
]

function downloadDemos() {
  for (const url of demoFiles) {
    const a = document.createElement('a')
    a.href = url
    a.download = url.split('/').pop()!
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const dropped = Array.from(e.dataTransfer?.files || []).filter((f) => ALLOWED.includes(f.type))
  if (!dropped.length) { toast.error('Only PDF and image files are accepted'); return }
  files.value.push(...dropped)
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const selected = Array.from(input.files || []).filter((f) => ALLOWED.includes(f.type))
  if (!selected.length) { toast.error('Only PDF and image files are accepted'); return }
  files.value.push(...selected)
  input.value = ''
}

async function analyze() {
  if (files.value.length < 2) { toast.error('Upload at least 2 PDF quotations'); return }

  analyzing.value = true
  progressText.value = `Analyzing ${files.value.length} quotations with AI...`
  result.value = null

  try {
    const formData = new FormData()
    for (const file of files.value) {
      formData.append('files', file)
    }

    const { data } = await api.post('/quotation-compare', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    })

    result.value = data.data
    toast.success('Comparison complete!')
    fetchHistory()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to analyze quotations')
  } finally {
    analyzing.value = false
  }
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .trim()
}

function shortName(name: string): string {
  if (!name) return ''
  const words = name.replace(/\b(sdn|bhd|pte|ltd|enterprise|sdn bhd|pte ltd)\b/gi, '').trim().split(/\s+/)
  if (words.length <= 2) return words.join(' ')
  return words.slice(0, 2).join(' ')
}

function getPriceClass(item: any, supplier: string): string {
  if (item.prices[supplier] == null) return 'text-stone-300'
  if (supplier === item.cheapest) return 'text-green-600 font-semibold bg-green-50'
  const prices = Object.values(item.prices).filter((p) => p != null) as number[]
  const maxPrice = Math.max(...prices)
  if (item.prices[supplier] === maxPrice && prices.length > 1) return 'text-red-500'
  return 'text-stone-900'
}

function getSupplierTotal(supplier: string): number {
  if (!result.value) return 0
  return result.value.items.reduce((sum: number, item: any) => sum + (item.prices[supplier] || 0), 0)
}

const cheapestTotal = computed(() => {
  if (!result.value) return 0
  return Math.min(...result.value.suppliers.map((s: string) => getSupplierTotal(s)))
})

const cheapestSupplier = computed(() => {
  if (!result.value) return ''
  return result.value.suppliers.reduce((best: string, s: string) =>
    getSupplierTotal(s) < getSupplierTotal(best) ? s : best, result.value.suppliers[0])
})

async function fetchHistory() {
  loadingHistory.value = true
  try {
    const { data } = await api.get('/quotation-compare/history', { params: { limit: '10' } })
    history.value = data.data
  } catch {} finally {
    loadingHistory.value = false
  }
}

function loadComparison(item: any) {
  result.value = { suppliers: item.suppliers, items: item.items, summary: item.summary }
  toast.success('Loaded comparison from history')
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function exportToExcel() {
  if (!result.value) return
  const rows = result.value.items.map((item: any) => {
    const row: Record<string, any> = { Product: item.product, Unit: item.unit }
    for (const s of result.value.suppliers) {
      row[shortName(s)] = item.prices[s] != null ? Number(item.prices[s]).toFixed(2) : '-'
    }
    row['Cheapest'] = shortName(item.cheapest)
    return row
  })
  // Add totals row
  const totalRow: Record<string, any> = { Product: 'TOTAL', Unit: '' }
  for (const s of result.value.suppliers) {
    totalRow[shortName(s)] = getSupplierTotal(s).toFixed(2)
  }
  totalRow['Cheapest'] = shortName(cheapestSupplier.value)
  rows.push(totalRow)

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Comparison')
  XLSX.writeFile(wb, `quotation-comparison-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

onMounted(() => fetchHistory())
</script>
