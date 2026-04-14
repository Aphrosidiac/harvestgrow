<template>
  <div
    class="bg-white border-2 rounded-xl p-4 space-y-3"
    :class="borderClass"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
            {{ stop.sequence }}
          </span>
          <span class="font-mono text-sm text-stone-500">{{ stop.order?.orderNumber }}</span>
          <span class="text-[11px] px-2 py-0.5 rounded" :class="statusClass">{{ stop.status }}</span>
        </div>
        <div class="mt-2 text-base font-semibold text-stone-900">{{ stop.order?.contactName }}</div>
        <a v-if="stop.order?.contactPhone" :href="`tel:${stop.order.contactPhone}`" class="text-sm text-green-700 underline block mt-0.5">
          {{ stop.order.contactPhone }}
        </a>
      </div>
      <div class="text-right text-sm">
        <div class="font-semibold text-stone-900">RM {{ Number(stop.order?.total || 0).toFixed(2) }}</div>
        <div class="text-xs text-stone-500">{{ itemCount }} items</div>
      </div>
    </div>

    <div v-if="stop.order?.deliveryAddress" class="text-sm text-stone-700">
      <a :href="mapsUrl" target="_blank" rel="noopener" class="underline">
        {{ stop.order.deliveryAddress }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DeliveryStop } from '../../types'

const props = defineProps<{ stop: DeliveryStop }>()

const itemCount = computed(() => props.stop.order?.lines?.length ?? 0)

const mapsUrl = computed(() => {
  const q = encodeURIComponent(props.stop.order?.deliveryAddress || '')
  return `https://www.google.com/maps/search/?api=1&query=${q}`
})

const borderClass = computed(() => {
  switch (props.stop.status) {
    case 'DELIVERED': return 'border-green-500'
    case 'FAILED': return 'border-red-500'
    case 'SKIPPED': return 'border-stone-400'
    case 'ARRIVED': return 'border-amber-500'
    default: return 'border-stone-200'
  }
})

const statusClass = computed(() => {
  switch (props.stop.status) {
    case 'DELIVERED': return 'bg-green-100 text-green-700'
    case 'FAILED': return 'bg-red-100 text-red-700'
    case 'SKIPPED': return 'bg-stone-100 text-stone-700'
    case 'ARRIVED': return 'bg-amber-100 text-amber-700'
    default: return 'bg-stone-100 text-stone-600'
  }
})
</script>
