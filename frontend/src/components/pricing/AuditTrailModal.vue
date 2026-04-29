<template>
  <BaseModal v-model="open" title="" size="full">
    <div class="space-y-4">
      <div>
        <h3 class="text-lg font-semibold text-stone-900">Audit Trail ({{ formatDateShort(auditDate) }})</h3>
        <p class="text-sm text-stone-500">History of pricing changes made on {{ formatDateLong(auditDate) }}.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input v-model="search" placeholder="Search logs by staff, operation or details..." class="w-full pl-9 pr-3 py-2 bg-stone-100 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
        </div>
        <input v-model="auditDate" type="date" class="bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm" @change="fetchLogs" />
      </div>
      <div class="max-h-[60vh] overflow-y-auto border border-stone-200 rounded-lg">
        <div v-if="loading" class="text-center py-8 text-stone-400">Loading...</div>
        <div v-else-if="!logs.length" class="text-center py-8 text-stone-400">No pricing changes on this date.</div>
        <div v-else v-for="log in filteredLogs" :key="log.id" class="px-4 py-3 border-b border-stone-100 last:border-b-0">
          <div class="flex items-start gap-6">
            <div class="text-sm text-stone-500 whitespace-nowrap w-24">{{ formatTime(log.createdAt) }}</div>
            <div class="text-sm text-stone-700 w-28">{{ log.userName }}</div>
            <div class="flex-1">
              <span class="text-xs font-medium text-[rgb(134,153,64)]">Pricing Update</span>
              <div class="text-sm text-stone-600 mt-0.5">{{ formatDetails(log.changes) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <BaseButton variant="secondary" @click="open = false">Close</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import api from '../../lib/api'
import { fmtTime, fmtDate as fmtDateShortUtil, fmtDateLong as fmtDateLongUtil } from '../../lib/date-utils'
import BaseModal from '../base/BaseModal.vue'
import BaseButton from '../base/BaseButton.vue'
import { Search } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()
const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

const auditDate = ref(new Date().toISOString().slice(0, 10))
const logs = ref<any[]>([])
const loading = ref(false)
const search = ref('')

const filteredLogs = computed(() => {
  if (!search.value) return logs.value
  const q = search.value.toLowerCase()
  return logs.value.filter((l: any) => l.userName?.toLowerCase().includes(q) || JSON.stringify(l.changes).toLowerCase().includes(q))
})

async function fetchLogs() {
  loading.value = true
  try {
    const { data } = await api.get('/pricing-boards/audit-trail', { params: { date: auditDate.value, limit: 200 } })
    logs.value = data.data || []
  } catch { logs.value = [] }
  finally { loading.value = false }
}

const formatTime = fmtTime
const formatDateShort = fmtDateShortUtil
const formatDateLong = fmtDateLongUtil

function formatDetails(changes: any) {
  if (!changes) return ''
  if (changes.operation === 'batch-copy') return `Batch Copy | Source: ${changes.sourceBoardId} | Product: ${changes.stockItemId} | Price: ${changes.price}`
  return `Updated Board Item | Product: ${changes.stockItemId} | Price: ${changes.oldPrice} → ${changes.newPrice}`
}

watch(() => props.modelValue, (v) => { if (v) fetchLogs() })
</script>
