<template>
  <div>
    <!-- Supplier Categories -->
    <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-stone-500 uppercase">Supplier Categories</h3>
        <BaseButton variant="primary" size="sm" @click="openCategoryModal(null)"><Plus class="w-4 h-4 mr-1" /> Add Category</BaseButton>
      </div>

      <div v-if="!categories.length" class="text-center text-stone-400 py-4 text-sm">No supplier categories. Create one to start broadcasting.</div>
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="cat in categories" :key="cat.id"
          class="border rounded-lg p-3 cursor-pointer transition-all"
          :class="selectedCategory === cat.id ? 'border-green-600 bg-green-50 ring-1 ring-green-600' : 'border-stone-200 hover:border-green-400'"
          @click="selectedCategory = cat.id"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-semibold text-stone-900">{{ cat.name }}</span>
            <div class="flex gap-1">
              <button @click.stop="openCategoryModal(cat)" class="text-stone-400 hover:text-blue-500"><Pencil class="w-3 h-3" /></button>
              <button @click.stop="handleDeleteCategory(cat)" class="text-stone-400 hover:text-red-500"><Trash2 class="w-3 h-3" /></button>
            </div>
          </div>
          <p class="text-xs text-stone-500">{{ cat._count?.suppliers || 0 }} suppliers</p>
        </div>
      </div>

      <!-- Assign suppliers to selected category -->
      <div v-if="selectedCategory" class="mt-4 pt-4 border-t border-stone-200">
        <div class="flex items-center gap-2 mb-3">
          <h4 class="text-xs font-semibold text-stone-500 uppercase">Suppliers in this category</h4>
          <BaseButton variant="secondary" size="sm" @click="showAssignModal = true"><Plus class="w-3 h-3 mr-1" /> Assign</BaseButton>
        </div>
        <div v-if="!categorySuppliers.length" class="text-xs text-stone-400">No suppliers assigned yet.</div>
        <div v-else class="flex flex-wrap gap-2">
          <span v-for="s in categorySuppliers" :key="s.id" class="inline-flex items-center gap-1.5 bg-stone-200 text-stone-700 text-xs px-2.5 py-1 rounded-lg">
            {{ s.companyName }}
            <button @click="unassignSupplier(s.id)" class="text-stone-400 hover:text-red-500"><X class="w-3 h-3" /></button>
          </span>
        </div>
      </div>
    </div>

    <!-- Compose Quotation -->
    <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
      <h3 class="text-sm font-semibold text-stone-500 uppercase mb-4">Compose Quotation</h3>

      <div v-if="selectedCategory" class="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <p class="text-sm text-green-700">
          <Send class="w-4 h-4 inline mr-1" />
          <strong>{{ categorySuppliers.length }}</strong> suppliers will receive this quotation
          <span class="text-green-500">({{ selectedCategoryName }})</span>
        </p>
      </div>
      <div v-else class="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
        <p class="text-sm text-amber-700">Select a supplier category above to broadcast to.</p>
      </div>

      <!-- Items -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <label class="text-xs font-semibold text-stone-500 uppercase">Items</label>
          <BaseButton variant="secondary" size="sm" @click="addItem"><Plus class="w-3 h-3 mr-1" /> Add Item</BaseButton>
        </div>
        <div v-if="!items.length" class="text-center text-stone-400 py-4 text-sm">Add items to your quotation.</div>
        <div v-else class="space-y-2">
          <div v-for="(item, idx) in items" :key="idx" class="grid grid-cols-12 gap-2 items-end">
            <div class="col-span-4">
              <input v-model="item.product" placeholder="Product name" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
            </div>
            <div class="col-span-2">
              <input v-model.number="item.quantity" type="number" step="0.1" placeholder="Qty" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
            </div>
            <div class="col-span-2">
              <input v-model="item.unit" placeholder="Unit" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
            </div>
            <div class="col-span-3">
              <input v-model.number="item.price" type="number" step="0.01" placeholder="Price (RM)" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-2 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
            </div>
            <div class="col-span-1 text-right">
              <button @click="items.splice(idx, 1)" class="text-stone-400 hover:text-red-500"><Trash2 class="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <!-- Message -->
      <div class="mb-4">
        <label class="block text-xs text-stone-500 mb-1">Additional Message (optional)</label>
        <textarea v-model="message" rows="2" placeholder="Any special notes..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500 resize-none" />
      </div>

      <!-- Preview -->
      <div v-if="items.length" class="bg-stone-100 rounded-lg p-4 mb-4">
        <p class="text-xs text-stone-500 uppercase font-semibold mb-2">Message Preview</p>
        <pre class="text-xs text-stone-700 whitespace-pre-wrap font-sans">{{ messagePreview }}</pre>
      </div>

      <!-- Send -->
      <div class="flex items-center justify-end gap-3">
        <BaseButton variant="primary" :loading="broadcasting" :disabled="!selectedCategory || !items.length || !categorySuppliers.length" @click="handleBroadcast">
          <Send class="w-4 h-4 mr-1.5" /> Send Quotation
        </BaseButton>
      </div>
    </div>

    <!-- Results -->
    <div v-if="broadcastResult" class="bg-white border border-stone-200 rounded-xl p-6">
      <h3 class="text-sm font-semibold text-stone-500 uppercase mb-4">Broadcast Results</h3>
      <div class="flex items-center gap-6 mb-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ broadcastResult.sent }}</p>
          <p class="text-xs text-stone-500">Sent</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-red-500">{{ broadcastResult.failed }}</p>
          <p class="text-xs text-stone-500">Failed</p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-stone-600">{{ broadcastResult.total }}</p>
          <p class="text-xs text-stone-500">Total</p>
        </div>
      </div>
      <div class="space-y-1">
        <div v-for="r in broadcastResult.results" :key="r.phone" class="flex items-center gap-2 text-sm">
          <CheckCircle v-if="r.status === 'sent'" class="w-4 h-4 text-green-500" />
          <XCircle v-else class="w-4 h-4 text-red-500" />
          <span class="text-stone-700">{{ r.supplier }}</span>
          <span class="text-stone-400 text-xs">{{ r.phone }}</span>
          <span v-if="r.error" class="text-red-400 text-xs">{{ r.error }}</span>
        </div>
      </div>
    </div>

    <!-- Category Modal -->
    <BaseModal v-model="showCategoryModal" :title="editingCategory ? 'Edit Category' : 'Add Supplier Category'" size="sm">
      <div class="space-y-4">
        <BaseInput v-model="categoryForm.name" label="Category Name" placeholder="e.g. Singapore, Mini Market" required />
        <BaseInput v-model="categoryForm.description" label="Description" placeholder="Optional description" />
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showCategoryModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="savingCategory" @click="handleSaveCategory">{{ editingCategory ? 'Update' : 'Create' }}</BaseButton>
      </template>
    </BaseModal>

    <!-- Assign Supplier Modal -->
    <BaseModal v-model="showAssignModal" title="Assign Supplier to Category" size="sm">
      <div>
        <label class="block text-xs text-stone-500 mb-1">Select Supplier</label>
        <select v-model="assignSupplierId" class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50">
          <option value="">— Select —</option>
          <option v-for="s in unassignedSuppliers" :key="s.id" :value="s.id">{{ s.companyName }} ({{ s.phone || 'no phone' }})</option>
        </select>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showAssignModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" :disabled="!assignSupplierId" @click="handleAssign">Assign</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseModal from '../../components/base/BaseModal.vue'
import { Plus, Pencil, Trash2, Send, X, CheckCircle, XCircle } from 'lucide-vue-next'

const toast = useToast()

const categories = ref<any[]>([])
const allSuppliers = ref<any[]>([])
const selectedCategory = ref('')
const items = ref<{ product: string; quantity: number; unit: string; price: number }[]>([])
const message = ref('')
const broadcasting = ref(false)
const broadcastResult = ref<any>(null)

const showCategoryModal = ref(false)
const editingCategory = ref<string | null>(null)
const savingCategory = ref(false)
const categoryForm = reactive({ name: '', description: '' })

const showAssignModal = ref(false)
const assignSupplierId = ref('')

const categorySuppliers = computed(() =>
  allSuppliers.value.filter((s) => s.supplierCategoryId === selectedCategory.value)
)

const selectedCategoryName = computed(() =>
  categories.value.find((c) => c.id === selectedCategory.value)?.name || ''
)

const unassignedSuppliers = computed(() =>
  allSuppliers.value.filter((s) => !s.supplierCategoryId || s.supplierCategoryId !== selectedCategory.value)
)

const messagePreview = computed(() => {
  let text = `*HARVEST GROW VEG SDN BHD*\n📋 Quotation Request\n\n`
  for (const item of items.value) {
    if (item.product) text += `• ${item.product} — ${item.quantity} ${item.unit} @ RM ${Number(item.price || 0).toFixed(2)}\n`
  }
  if (message.value) text += `\n📝 ${message.value}`
  text += `\n\nPlease confirm availability and best price. Thank you.`
  return text
})

function addItem() {
  items.value.push({ product: '', quantity: 1, unit: 'kg', price: 0 })
}

async function fetchCategories() {
  try {
    const { data } = await api.get('/quotation-broadcast/supplier-categories', { params: { limit: '100' } })
    categories.value = data.data
  } catch {}
}

async function fetchSuppliers() {
  try {
    const { data } = await api.get('/suppliers', { params: { limit: '200' } })
    allSuppliers.value = data.data
  } catch {}
}

function openCategoryModal(cat: any) {
  editingCategory.value = cat?.id || null
  categoryForm.name = cat?.name || ''
  categoryForm.description = cat?.description || ''
  showCategoryModal.value = true
}

async function handleSaveCategory() {
  savingCategory.value = true
  try {
    if (editingCategory.value) {
      await api.put(`/quotation-broadcast/supplier-categories/${editingCategory.value}`, categoryForm)
    } else {
      await api.post('/quotation-broadcast/supplier-categories', categoryForm)
    }
    toast.success('Category saved')
    showCategoryModal.value = false
    fetchCategories()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') } finally { savingCategory.value = false }
}

async function handleDeleteCategory(cat: any) {
  if (!confirm(`Delete "${cat.name}"?`)) return
  try {
    await api.delete(`/quotation-broadcast/supplier-categories/${cat.id}`)
    toast.success('Category deleted')
    if (selectedCategory.value === cat.id) selectedCategory.value = ''
    fetchCategories()
    fetchSuppliers()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
}

async function handleAssign() {
  try {
    await api.post('/quotation-broadcast/assign-category', { supplierId: assignSupplierId.value, categoryId: selectedCategory.value })
    toast.success('Supplier assigned')
    showAssignModal.value = false
    assignSupplierId.value = ''
    fetchSuppliers()
    fetchCategories()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
}

async function unassignSupplier(supplierId: string) {
  try {
    await api.post('/quotation-broadcast/assign-category', { supplierId, categoryId: null })
    toast.success('Supplier removed from category')
    fetchSuppliers()
    fetchCategories()
  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
}

async function handleBroadcast() {
  broadcasting.value = true
  broadcastResult.value = null
  try {
    const { data } = await api.post('/quotation-broadcast/broadcast', {
      categoryId: selectedCategory.value,
      items: items.value.filter((i) => i.product),
      message: message.value,
    })
    broadcastResult.value = data.data
    toast.success(`Sent to ${data.data.sent} suppliers`)
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to broadcast')
  } finally {
    broadcasting.value = false
  }
}

onMounted(() => { fetchCategories(); fetchSuppliers() })
</script>
