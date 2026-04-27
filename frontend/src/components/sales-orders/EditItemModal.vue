<template>
  <BaseModal v-model="open" title="Edit Item" size="full">
    <div class="grid grid-cols-3 gap-6">
      <!-- LEFT: Product search, image, balance, last ordered -->
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-stone-600 mb-1">Product *</label>
          <div class="relative">
            <input
              v-model="productSearch"
              type="text"
              placeholder="Search product..."
              class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50"
              @input="searchProducts"
            />
            <div v-if="productResults.length" class="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <button
                v-for="p in productResults"
                :key="p.id"
                @click="selectProduct(p)"
                class="w-full text-left px-3 py-2 text-sm hover:bg-stone-100 transition-colors"
              >
                <div class="font-medium">{{ p.itemCode }} - {{ p.description }}</div>
              </button>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-600 mb-1">Product Image</label>
          <div class="border border-stone-200 rounded-lg p-2 bg-white aspect-square flex items-center justify-center">
            <img v-if="selectedProduct?.imageUrl" :src="selectedProduct.imageUrl" class="max-h-full max-w-full object-contain rounded" />
            <span v-else class="text-stone-400 text-sm">No image</span>
          </div>
        </div>

        <div class="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-sm">
          <span class="text-stone-500 text-xs">EST. BALANCE</span>
          <span class="text-stone-600">{{ selectedProduct?.quantity ?? 'Not Available' }}</span>
        </div>

        <div v-if="lastOrdered.length">
          <label class="block text-xs font-medium text-stone-600 mb-2">Last Ordered</label>
          <div class="space-y-2">
            <div
              v-for="(lo, i) in lastOrdered"
              :key="i"
              class="border border-stone-200 rounded-lg px-3 py-2 text-sm"
            >
              <div class="text-xs text-stone-400">{{ fmtDate(lo.salesOrder.deliveryDate) }}</div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="font-medium text-stone-900">{{ lo.quantity }} {{ lo.unit }}</span>
                <span class="text-[rgb(134,153,64)] font-medium">RM{{ Number(lo.total).toFixed(2) }}</span>
              </div>
              <div class="text-xs text-stone-400">@ RM{{ Number(lo.unitPrice).toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CENTER: UOM + Description 2 -->
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-stone-600 mb-2">UOM *</label>
          <div v-if="uomVariants.length" class="space-y-2">
            <label
              v-for="v in uomVariants"
              :key="v.id"
              class="flex items-center justify-between border border-stone-200 rounded-lg px-4 py-3 cursor-pointer transition-colors"
              :class="itemForm.unit === v.uomCode ? 'border-[rgb(134,153,64)] bg-[rgb(134,153,64)]/5' : 'hover:bg-stone-50'"
            >
              <div class="flex items-center gap-3">
                <input type="radio" v-model="itemForm.unit" :value="v.uomCode" class="accent-[rgb(134,153,64)]" @change="onUomSelect(v)" />
                <span class="text-sm font-medium text-stone-900">{{ v.uomCode }}</span>
                <span v-if="v.isBase" class="text-[10px] px-1.5 py-0.5 rounded bg-[rgb(134,153,64)] text-white font-bold">BASE</span>
              </div>
              <span class="text-sm text-stone-600">RM{{ Number(v.price).toFixed(2) }}</span>
            </label>
          </div>
          <div v-else class="text-sm text-stone-400 py-4">No UOM variants configured for this product.</div>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-600 mb-1">Description 2</label>
          <input v-model="itemForm.secondDescription" placeholder="Enter description 2" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        </div>
      </div>

      <!-- RIGHT: Processing, Qty, Price, Remark, FOC -->
      <div class="space-y-4">
        <div v-if="processingOptions.length">
          <div class="flex flex-wrap gap-x-4 gap-y-2">
            <label v-for="opt in processingOptions" :key="opt" class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" :value="opt" v-model="selectedProcessing" class="accent-[rgb(134,153,64)]" />
              <span>{{ opt }} (RM0.00)</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-600 mb-1">Quantity *</label>
          <input v-model.number="itemForm.quantity" type="number" step="0.001" min="0" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-600 mb-1">Unit Price *</label>
          <input v-model.number="itemForm.unitPrice" type="number" step="0.01" min="0" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-600 mb-1">Remark</label>
          <input v-model="itemForm.remark" placeholder="Enter remark" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        </div>

        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="itemForm.foc" class="accent-[rgb(134,153,64)]" />
          <span class="text-sm font-medium text-stone-900">FOC</span>
        </label>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" @click="close">Cancel (F1)</BaseButton>
      <BaseButton variant="primary" @click="saveItem">Save Changes (Enter)</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useSalesOrderStore } from '../../stores/salesOrders'
import api from '../../lib/api'
import BaseModal from '../base/BaseModal.vue'
import BaseButton from '../base/BaseButton.vue'

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
  secondDescription?: string
  remark?: string
  imageUrl?: string
  foc?: boolean
  processing?: string
}

const props = defineProps<{
  modelValue: boolean
  editIndex: number | null
  existingItem: FormItem | null
  customerId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [item: FormItem]
}>()

const store = useSalesOrderStore()
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const itemForm = reactive<FormItem>({
  stockItemId: undefined,
  itemCode: '',
  description: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
  discountPercent: 0,
  taxRate: 0,
  notes: '',
  secondDescription: '',
  remark: '',
  imageUrl: '',
  foc: false,
  processing: '',
})

const productSearch = ref('')
const productResults = ref<any[]>([])
const selectedProduct = ref<any>(null)
const uomVariants = ref<any[]>([])
const lastOrdered = ref<any[]>([])
const selectedProcessing = ref<string[]>([])
const processingOptions = ref<string[]>([])

let searchTimeout: ReturnType<typeof setTimeout>

function searchProducts() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!productSearch.value || productSearch.value.length < 2) {
      productResults.value = []
      return
    }
    try {
      const { data } = await api.get('/stock', { params: { search: productSearch.value, limit: 15 } })
      productResults.value = data.data || []
    } catch {
      productResults.value = []
    }
  }, 300)
}

async function selectProduct(p: any) {
  selectedProduct.value = p
  itemForm.stockItemId = p.id
  itemForm.itemCode = p.itemCode
  itemForm.description = p.description
  itemForm.imageUrl = p.imageUrl || ''
  productSearch.value = `${p.itemCode} - ${p.description}`
  productResults.value = []

  // Parse cut options
  try {
    processingOptions.value = p.cutOptions ? JSON.parse(p.cutOptions) : []
  } catch {
    processingOptions.value = []
  }

  // Fetch UOM variants
  try {
    uomVariants.value = await store.fetchStockUomVariants(p.id)
  } catch {
    uomVariants.value = []
  }

  // Fetch last ordered
  try {
    lastOrdered.value = await store.fetchLastOrdered(p.id, props.customerId || undefined)
  } catch {
    lastOrdered.value = []
  }
}

function onUomSelect(v: any) {
  itemForm.unit = v.uomCode
  itemForm.unitPrice = Number(v.price)
}

function close() {
  emit('update:modelValue', false)
}

function saveItem() {
  if (!itemForm.description) return
  itemForm.processing = selectedProcessing.value.length ? JSON.stringify(selectedProcessing.value) : ''
  emit('save', { ...itemForm })
}

watch(() => props.modelValue, (v) => {
  if (!v) return
  if (props.existingItem) {
    Object.assign(itemForm, props.existingItem)
    productSearch.value = `${props.existingItem.itemCode || ''} - ${props.existingItem.description}`
    try {
      selectedProcessing.value = props.existingItem.processing ? JSON.parse(props.existingItem.processing) : []
    } catch {
      selectedProcessing.value = []
    }
    if (props.existingItem.stockItemId) {
      api.get(`/stock/${props.existingItem.stockItemId}`).then(({ data }) => {
        selectedProduct.value = data.data
        try { processingOptions.value = data.data.cutOptions ? JSON.parse(data.data.cutOptions) : [] } catch { processingOptions.value = [] }
      }).catch(() => {})
      store.fetchStockUomVariants(props.existingItem.stockItemId).then(v => uomVariants.value = v).catch(() => {})
      store.fetchLastOrdered(props.existingItem.stockItemId, props.customerId || undefined).then(v => lastOrdered.value = v).catch(() => {})
    }
  } else {
    Object.assign(itemForm, {
      stockItemId: undefined, itemCode: '', description: '', quantity: 1,
      unit: '', unitPrice: 0, discountPercent: 0, taxRate: 0, notes: '',
      secondDescription: '', remark: '', imageUrl: '', foc: false, processing: '',
    })
    productSearch.value = ''
    selectedProduct.value = null
    uomVariants.value = []
    lastOrdered.value = []
    selectedProcessing.value = []
    processingOptions.value = []
  }
})

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-MY') } catch { return d }
}
</script>
