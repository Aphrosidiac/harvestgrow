<template>
  <div class="max-w-md mx-auto p-4 space-y-4">
    <div>
      <h1 class="text-xl font-bold text-stone-900">Today's Trips</h1>
      <p class="text-sm text-stone-500">{{ today }}</p>
    </div>

    <div v-if="loading" class="text-stone-500 text-sm">Loading...</div>

    <div v-else-if="!store.myTrips.length" class="bg-white border border-stone-200 rounded-xl p-6 text-center">
      <Truck class="w-10 h-10 text-stone-300 mx-auto mb-2" />
      <p class="text-stone-600">No trips assigned for today.</p>
      <p class="text-xs text-stone-500 mt-1">Check back later or ask your dispatcher.</p>
    </div>

    <div v-for="trip in store.myTrips" :key="trip.id" class="bg-white border-2 border-stone-200 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-lg font-semibold text-stone-900">{{ trip.slot }} Slot</div>
          <div class="text-xs text-stone-500">{{ trip.stops?.length ?? 0 }} stops</div>
        </div>
        <span class="text-xs px-2 py-1 rounded" :class="statusBadge(trip.status)">{{ trip.status }}</span>
      </div>

      <div class="text-sm text-stone-700">
        Delivered: {{ deliveredCount(trip) }} / {{ trip.stops?.length ?? 0 }}
      </div>

      <div class="flex gap-2">
        <button
          v-if="trip.status === 'PLANNED'"
          @click="start(trip.id)"
          class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 font-semibold min-h-[56px]"
        >
          Start Trip
        </button>
        <RouterLink
          v-if="trip.status === 'IN_PROGRESS' || trip.status === 'PLANNED'"
          :to="`/driver/trip/${trip.id}`"
          class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 text-center font-semibold min-h-[56px] flex items-center justify-center"
        >
          Open Trip
        </RouterLink>
        <RouterLink
          v-else
          :to="`/driver/trip/${trip.id}`"
          class="flex-1 bg-stone-200 text-stone-700 rounded-lg py-3 text-center font-semibold min-h-[56px] flex items-center justify-center"
        >
          View
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Truck } from 'lucide-vue-next'
import { useDeliveryStore } from '../../stores/delivery'
import type { DeliveryTrip } from '../../types'

const store = useDeliveryStore()
const loading = ref(false)
const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })

async function load() {
  loading.value = true
  try {
    await store.fetchMyTrip(new Date().toISOString().slice(0, 10))
  } finally { loading.value = false }
}

async function start(id: string) {
  await store.startMyTrip(id)
  await load()
}

function deliveredCount(t: DeliveryTrip) {
  return (t.stops || []).filter((s) => s.status === 'DELIVERED').length
}

function statusBadge(s: string) {
  if (s === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700'
  if (s === 'COMPLETED') return 'bg-green-100 text-green-700'
  if (s === 'CANCELLED') return 'bg-red-100 text-red-700'
  return 'bg-stone-100 text-stone-700'
}

onMounted(load)
</script>
