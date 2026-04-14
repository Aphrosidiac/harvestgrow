<template>
  <div class="max-w-4xl">
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-stone-500 hover:text-stone-700 transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold text-stone-900">{{ pi?.internalNumber || 'Purchase Invoice' }}</h2>
      <BaseBadge v-if="pi" :color="statusColor">{{ pi.status.replace('_', ' ') }}</BaseBadge>
    </div>

    <div v-if="loading" class="text-stone-500">Loading...</div>

    <template v-else-if="pi">
      <!-- Actions -->
      <div class="flex items-center gap-3 mb-6">
        <BaseButton v-if="pi.status === 'ON_HOLD'" variant="secondary" size="sm" @click="$router.push(`/app/purchase-invoices/${pi.id}/edit`)">
          <Pencil class="w-4 h-4 mr-1" /> Edit
        </BaseButton>
        <BaseButton v-if="pi.status === 'ON_HOLD'" variant="primary" size="sm" @click="handleCheckAll" :loading="actionLoading">
          <CheckCheck class="w-4 h-4 mr-1" /> Check All
        </BaseButton>
        <BaseButton v-if="pi.status === 'ON_HOLD' && allChecked" variant="primary" size="sm" @click="handleVerify" :loading="actionLoading">
          Verify
        </BaseButton>
        <BaseButton v-if="pi.status === 'VERIFIED'" variant="primary" size="sm" @click="handleFinalize" :loading="actionLoading">
          Finalize (Update Stock)
        </BaseButton>
        <BaseButton v-if="['ON_HOLD', 'VERIFIED'].includes(pi.status)" variant="danger" size="sm" @click="handleCancel" :loading="actionLoading">
          Cancel
        </BaseButton>
      </div>

      <!-- Invoice Info -->
      <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <div class="grid sm:grid-cols-2 gap-4 text-sm">
          <div><span class="text-stone-500">Supplier:</span> <span class="text-stone-900 font-medium">{{ pi.supplier?.companyName }}</span></div>
          <div><span class="text-stone-500">Supplier Inv#:</span> <span class="text-stone-900">{{ pi.invoiceNumber }}</span></div>
          <div><span class="text-stone-500">Date:</span> <span class="text-stone-900">{{ formatDate(pi.issueDate) }}</span></div>
          <div v-if="pi.receivedDate"><span class="text-stone-500">Received:</span> <span class="text-stone-900">{{ formatDate(pi.receivedDate) }}</span></div>
          <div><span class="text-stone-500">Total:</span> <span class="text-green-600 font-bold">RM {{ Number(pi.totalAmount).toFixed(2) }}</span></div>
          <div v-if="pi.notes"><span class="text-stone-500">Notes:</span> <span class="text-stone-600">{{ pi.notes }}</span></div>
        </div>
      </div>

      <!-- Items with checking -->
      <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Items ({{ checkedCount }}/{{ pi.items?.length || 0 }} checked)</h3>
        <div class="space-y-2">
          <div v-for="item in pi.items" :key="item.id" class="flex items-center gap-3 bg-stone-200/30 rounded-lg px-4 py-3">
            <button v-if="pi.status === 'ON_HOLD'" @click="toggleCheck(item)" class="flex-shrink-0">
              <div :class="['w-5 h-5 rounded border-2 flex items-center justify-center transition-colors', item.isChecked ? 'bg-green-600 border-green-600' : 'border-stone-500']">
                <Check v-if="item.isChecked" class="w-3 h-3 text-white" />
              </div>
            </button>
            <div v-else class="flex-shrink-0">
              <div :class="['w-5 h-5 rounded border-2 flex items-center justify-center', item.isChecked ? 'bg-green-600 border-green-600' : 'border-stone-500']">
                <Check v-if="item.isChecked" class="w-3 h-3 text-white" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-stone-900 text-sm">
                <span v-if="item.itemCode" class="font-mono text-stone-500 text-xs mr-1">{{ item.itemCode }}</span>
                {{ item.description }}
              </p>
              <p class="text-stone-500 text-xs">
                {{ item.quantity }} x RM{{ Number(item.unitPrice).toFixed(2) }}
              </p>
            </div>
            <span class="text-stone-700 text-sm font-medium">RM {{ Number(item.total).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- Attachments -->
      <div class="bg-white border border-stone-200 rounded-xl p-6">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Attachments</h3>
        <div v-if="!pi.attachments?.length" class="text-stone-500 text-sm">No attachments.</div>
        <div v-else class="space-y-2">
          <div v-for="a in pi.attachments" :key="a.id" class="flex items-center gap-3 text-sm">
            <Paperclip class="w-4 h-4 text-stone-500" />
            <a :href="a.fileUrl" target="_blank" class="text-blue-400 hover:text-blue-300">{{ a.fileName }}</a>
            <span class="text-stone-500 text-xs">{{ (a.fileSize / 1024).toFixed(0) }} KB</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import { ArrowLeft, Pencil, CheckCheck, Check, Paperclip } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const pi = ref<any>(null)
const loading = ref(true)
const actionLoading = ref(false)

const statusColor = computed(() => {
  const s = pi.value?.status
  if (s === 'FINALIZED') return 'green'
  if (s === 'VERIFIED') return 'blue'
  if (s === 'CANCELLED') return 'red'
  return 'gold'
})

const allChecked = computed(() => pi.value?.items?.every((i: any) => i.isChecked))
const checkedCount = computed(() => pi.value?.items?.filter((i: any) => i.isChecked).length || 0)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function fetchPI() {
  loading.value = true
  try {
    const { data } = await api.get(`/purchase-invoices/${route.params.id}`)
    pi.value = data.data
  } catch {
    toast.error('Failed to load purchase invoice')
    router.push('/app/purchase-invoices')
  } finally {
    loading.value = false
  }
}

async function toggleCheck(item: any) {
  try {
    await api.patch(`/purchase-invoices/${pi.value.id}/items/${item.id}/check`)
    item.isChecked = !item.isChecked
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to update')
  }
}

async function handleCheckAll() {
  actionLoading.value = true
  try {
    await api.patch(`/purchase-invoices/${pi.value.id}/check-all`)
    await fetchPI()
    toast.success('All items checked')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed')
  } finally {
    actionLoading.value = false
  }
}

async function handleVerify() {
  actionLoading.value = true
  try {
    await api.post(`/purchase-invoices/${pi.value.id}/verify`)
    await fetchPI()
    toast.success('Invoice verified')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed')
  } finally {
    actionLoading.value = false
  }
}

async function handleFinalize() {
  if (!confirm('This will update stock quantities. Are you sure?')) return
  actionLoading.value = true
  try {
    await api.post(`/purchase-invoices/${pi.value.id}/finalize`)
    await fetchPI()
    toast.success('Invoice finalized — stock updated')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed')
  } finally {
    actionLoading.value = false
  }
}

async function handleCancel() {
  if (!confirm('Cancel this purchase invoice?')) return
  actionLoading.value = true
  try {
    await api.post(`/purchase-invoices/${pi.value.id}/cancel`)
    await fetchPI()
    toast.success('Invoice cancelled')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => fetchPI())
</script>
