<template>
  <BaseModal v-model="open" title="" size="full">
    <template #default>
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-stone-900">Generate Quotation</h3>
          <p class="text-sm text-stone-500">Configure your quotation details and preview before download.</p>
        </div>
        <div class="flex items-center gap-3">
          <BaseButton variant="secondary" @click="open = false">Cancel</BaseButton>
          <BaseButton variant="primary" @click="downloadPdf"><Download class="w-4 h-4 mr-1" /> Download PDF</BaseButton>
        </div>
      </div>

      <div class="grid grid-cols-[320px_1fr] gap-6">
        <!-- Left: Settings -->
        <div class="space-y-6">
          <div>
            <h4 class="text-xs font-bold text-[rgb(134,153,64)] uppercase mb-3">1 Primary Settings</h4>
            <div class="space-y-3">
              <div>
                <label class="block text-sm text-stone-600 mb-1">Select Pricing Board</label>
                <select v-model="selectedBoardId" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm" @change="loadBoard">
                  <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }} ({{ fmtDate(b.validFrom) }} - {{ fmtDate(b.validTo) }})</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-stone-600 mb-1">Select Customer Group</label>
                <select v-model="selectedGroupId" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm">
                  <option v-for="g in availableGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-stone-600 mb-1">Representative Customer</label>
                <select v-model="selectedCustomerId" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">None (General Quotation)</option>
                  <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.companyName || c.name }}</option>
                </select>
                <p class="text-xs text-stone-400 mt-1">Changing this will update customer-specific info (address, etc.)</p>
              </div>
            </div>
          </div>

          <div>
            <h4 class="text-xs font-bold text-[rgb(134,153,64)] uppercase mb-3">2 Document Configuration</h4>
            <div>
              <label class="block text-sm text-stone-600 mb-1">Valid Until</label>
              <input v-model="validUntil" type="date" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div class="bg-stone-50 rounded-lg p-3">
            <h4 class="text-xs font-bold text-[rgb(134,153,64)] uppercase mb-2">Preview Context</h4>
            <p class="text-sm text-stone-700 font-medium">{{ selectedCustomer?.companyName || selectedCustomer?.name || 'No Customer Selected' }}</p>
            <p class="text-xs text-[rgb(134,153,64)]">Group ID: {{ selectedGroupId ? availableGroups.find(g => g.id === selectedGroupId)?.name : '-' }}</p>
          </div>
        </div>

        <!-- Right: Preview -->
        <div class="border border-stone-200 rounded-lg bg-white p-8 max-h-[70vh] overflow-y-auto shadow-inner">
          <div class="max-w-2xl mx-auto text-sm">
            <div class="text-center mb-6">
              <h2 class="text-lg font-bold">{{ COMPANY.fullName }}</h2>
              <p class="text-xs text-stone-600">{{ COMPANY.addressLine1 }}</p>
              <p class="text-xs text-stone-600">{{ COMPANY.addressLine2 }}</p>
              <p class="text-xs text-stone-600">TEL : {{ COMPANY.phone }} HP : {{ COMPANY.hp }} ({{ COMPANY.email.toUpperCase() }})</p>
            </div>

            <div class="text-center mb-4 text-xs text-stone-500">
              VALID FROM: {{ boardDetail ? fmtDate(boardDetail.validFrom) : '' }} - {{ validUntil || (boardDetail ? fmtDate(boardDetail.validTo) : '') }}
            </div>

            <table class="w-full text-xs border-collapse border border-stone-300">
              <thead>
                <tr class="bg-[rgb(134,153,64)] text-white">
                  <th class="border border-stone-300 px-2 py-1.5 text-center w-8">No</th>
                  <th class="border border-stone-300 px-2 py-1.5 text-left">Description</th>
                  <th class="border border-stone-300 px-2 py-1.5 text-center w-24">Packaging</th>
                  <th class="border border-stone-300 px-2 py-1.5 text-center w-16">UOM</th>
                  <th class="border border-stone-300 px-2 py-1.5 text-center w-16">PRICE</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in previewItems" :key="String(idx)" class="hover:bg-stone-50">
                  <td class="border border-stone-200 px-2 py-1 text-center">{{ Number(idx) + 1 }}</td>
                  <td class="border border-stone-200 px-2 py-1">{{ item.stockItem.itemCode }}  {{ item.stockItem.description }}</td>
                  <td class="border border-stone-200 px-2 py-1 text-center">{{ item.stockItem.uom }}</td>
                  <td class="border border-stone-200 px-2 py-1 text-center">{{ item.stockItem.uom }}</td>
                  <td class="border border-stone-200 px-2 py-1 text-center">{{ Number(item.price).toFixed(2) }}</td>
                </tr>
                <tr v-if="!previewItems.length">
                  <td colspan="5" class="text-center py-4 text-stone-400">No items with prices set.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseModal from '../base/BaseModal.vue'
import BaseButton from '../base/BaseButton.vue'
import { COMPANY } from '../../lib/company'
import { fmtDateShort } from '../../lib/date-utils'
import { Download } from 'lucide-vue-next'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const props = defineProps<{
  modelValue: boolean
  boardId: string
  boards: any[]
  groups: any[]
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()
const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })
const toast = useToast()

const selectedBoardId = ref('')
const selectedGroupId = ref('')
const selectedCustomerId = ref('')
const validUntil = ref('')
const boardDetail = ref<any>(null)
const customers = ref<any[]>([])
const selectedCustomer = computed(() => customers.value.find(c => c.id === selectedCustomerId.value))

const availableGroups = computed(() => {
  if (!boardDetail.value) return props.groups
  const boardGroupIds = (boardDetail.value.groups || []).map((g: any) => g.customerGroup?.id || g.customerGroupId)
  return props.groups.filter((g: any) => boardGroupIds.includes(g.id))
})

const previewItems = computed(() => {
  if (!boardDetail.value?.items) return []
  return boardDetail.value.items.filter((i: any) => Number(i.price) > 0).sort((a: any, b: any) => (a.stockItem?.itemCode || '').localeCompare(b.stockItem?.itemCode || ''))
})

async function loadBoard() {
  if (!selectedBoardId.value) return
  try {
    const { data } = await api.get(`/pricing-boards/${selectedBoardId.value}`)
    boardDetail.value = data.data
    validUntil.value = data.data.validTo?.slice(0, 10) || ''
    const groupIds = (data.data.groups || []).map((g: any) => g.customerGroup?.id)
    if (groupIds.length) selectedGroupId.value = groupIds[0]
  } catch { toast.error('Failed to load board') }
}

watch(selectedGroupId, async (gid) => {
  if (!gid) { customers.value = []; return }
  try {
    const { data } = await api.get('/customers', { params: { customerGroupId: gid, limit: 200 } })
    customers.value = data.data || []
  } catch { customers.value = [] }
})

const fmtDate = fmtDateShort

function downloadPdf() {
  if (!boardDetail.value || !previewItems.value.length) { toast.error('No items to export'); return }
  const doc = new jsPDF()
  const pw = doc.internal.pageSize.width

  doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
  doc.text(COMPANY.fullName, pw / 2, 18, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.text(COMPANY.addressLine1, pw / 2, 24, { align: 'center' })
  doc.text(COMPANY.addressLine2, pw / 2, 28, { align: 'center' })
  doc.text(`TEL : ${COMPANY.phone} HP : ${COMPANY.hp} (${COMPANY.email.toUpperCase()})`, pw / 2, 32, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`VALID FROM: ${fmtDate(boardDetail.value.validFrom)} - ${validUntil.value || fmtDate(boardDetail.value.validTo)}`, pw / 2, 40, { align: 'center' })

  autoTable(doc, {
    startY: 46,
    head: [['No', 'Description', 'Packaging', 'UOM', 'PRICE']],
    body: previewItems.value.map((item: any, idx: number) => [
      String(idx + 1),
      `${item.stockItem.itemCode}  ${item.stockItem.description}`,
      item.stockItem.uom,
      item.stockItem.uom,
      Number(item.price).toFixed(2),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [134, 153, 64], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 18, halign: 'center' } },
  })

  doc.save(`quotation-${boardDetail.value.name}.pdf`)
}

watch(() => props.modelValue, (v) => {
  if (v && props.boardId) {
    selectedBoardId.value = props.boardId
    loadBoard()
  }
})
</script>
