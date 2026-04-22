<template>
  <div>
    <div v-if="!trip" class="text-stone-500 text-sm">Loading...</div>
    <div v-else>
      <div class="flex items-start justify-between mb-3">
        <div>
          <h2 class="text-lg font-semibold">{{ trip.driver?.user?.name }}</h2>
          <p class="text-xs text-stone-500">{{ trip.slot }} · {{ trip.driver?.vehiclePlate || 'No plate' }}</p>
        </div>
        <button class="text-stone-500 hover:text-stone-900" @click="$emit('close')"><X class="w-5 h-5" /></button>
      </div>

      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs font-semibold px-2 py-1 rounded" :class="tripBadge">{{ trip.status }}</span>
        <span class="text-xs text-stone-500">{{ deliveredCount }}/{{ trip.stops?.length ?? 0 }} delivered</span>
        <RouterLink :to="`/app/delivery/trips/${trip.id}`" class="ml-auto text-xs text-green-700 underline">Open full detail →</RouterLink>
      </div>

      <div class="space-y-2 mb-4">
        <div v-for="(s, idx) in trip.stops || []" :key="s.id" class="flex items-start gap-2 border border-stone-200 rounded-lg p-2 text-sm">
          <div class="flex flex-col gap-1">
            <button @click="move(s.id, idx - 1)" :disabled="idx === 0" class="text-stone-500 disabled:opacity-30"><ChevronUp class="w-4 h-4" /></button>
            <button @click="move(s.id, idx + 1)" :disabled="idx === (trip.stops?.length ?? 0) - 1" class="text-stone-500 disabled:opacity-30"><ChevronDown class="w-4 h-4" /></button>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs text-stone-500">#{{ s.sequence }}</span>
              <span class="font-mono font-semibold">{{ s.order?.orderNumber }}</span>
              <span class="text-xs px-2 py-0.5 rounded ml-auto" :class="stopBadge(s.status)">{{ s.status }}</span>
            </div>
            <div class="text-stone-700">{{ s.order?.contactName }}</div>
            <div class="text-xs text-stone-500 truncate">{{ s.order?.deliveryAddress }}</div>
          </div>
          <button
            v-if="s.status === 'PENDING'"
            @click="remove(s.id)"
            class="text-red-600 hover:text-red-700 text-xs underline"
          >Remove</button>
        </div>
      </div>

      <button
        v-if="trip.status !== 'CANCELLED' && trip.status !== 'COMPLETED'"
        @click="cancel"
        class="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-lg py-2 text-sm"
      >Cancel Trip</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { X, ChevronUp, ChevronDown } from 'lucide-vue-next'
import { useDeliveryStore } from '../../stores/delivery'
import { useConfirm } from '../../composables/useConfirm'
import type { DeliveryTrip } from '../../types'

const props = defineProps<{ tripId: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'changed'): void }>()

const store = useDeliveryStore()
const confirm = useConfirm()
const trip = ref<DeliveryTrip | null>(null)

async function load() {
  trip.value = await store.fetchTripDetail(props.tripId)
}

const deliveredCount = computed(() => (trip.value?.stops || []).filter((s) => s.status === 'DELIVERED').length)
const tripBadge = computed(() => {
  const s = trip.value?.status
  if (s === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700'
  if (s === 'COMPLETED') return 'bg-green-100 text-green-700'
  if (s === 'CANCELLED') return 'bg-red-100 text-red-700'
  return 'bg-stone-100 text-stone-700'
})

async function move(stopId: string, newIdx: number) {
  if (newIdx < 0) return
  await store.updateStopSequence(stopId, newIdx + 1)
  await load()
  emit('changed')
}

async function remove(stopId: string) {
  if (!(await confirm.show('Remove Stop', 'Remove this stop from the trip? The order will return to READY.', { confirmLabel: 'Remove' }))) return
  await store.removeStop(stopId)
  await load()
  emit('changed')
}

async function cancel() {
  if (!(await confirm.show('Cancel Trip', 'Cancel this entire trip?', { confirmLabel: 'Cancel Trip' }))) return
  await store.cancelTrip(props.tripId)
  await load()
  emit('changed')
}

function stopBadge(s: string) {
  if (s === 'DELIVERED') return 'bg-green-100 text-green-700'
  if (s === 'FAILED') return 'bg-red-100 text-red-700'
  if (s === 'ARRIVED') return 'bg-amber-100 text-amber-700'
  if (s === 'SKIPPED') return 'bg-stone-100 text-stone-500'
  return 'bg-stone-100 text-stone-700'
}

watch(() => props.tripId, load)
onMounted(load)
</script>
