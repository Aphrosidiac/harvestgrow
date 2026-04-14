<template>
  <div>
    <div v-if="!trip" class="text-stone-500">Loading...</div>
    <div v-else>
      <div class="flex items-center gap-3 mb-4 print:hidden">
        <RouterLink to="/app/delivery/dispatch" class="text-sm text-green-700 underline">← Back to Dispatch</RouterLink>
        <button @click="print" class="ml-auto bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg px-3 py-1.5 text-sm inline-flex items-center gap-1">
          <Printer class="w-4 h-4" /> Print Manifest
        </button>
      </div>

      <div class="bg-white border border-stone-200 rounded-xl p-5 mb-4">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-xl font-semibold text-stone-900">Trip Manifest</h1>
            <p class="text-sm text-stone-600">{{ fmtDate(trip.date) }} · {{ trip.slot }}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded" :class="tripBadge">{{ trip.status }}</span>
        </div>
        <div class="mt-3 text-sm text-stone-700">
          <div><span class="text-stone-500">Driver:</span> {{ trip.driver?.user?.name }}</div>
          <div><span class="text-stone-500">Phone:</span> {{ trip.driver?.phone || '-' }}</div>
          <div><span class="text-stone-500">Vehicle:</span> {{ trip.driver?.vehiclePlate || '-' }}</div>
          <div><span class="text-stone-500">Started:</span> {{ fmtDT(trip.startedAt) }}</div>
          <div><span class="text-stone-500">Completed:</span> {{ fmtDT(trip.completedAt) }}</div>
        </div>
      </div>

      <div v-for="s in trip.stops || []" :key="s.id" class="bg-white border border-stone-200 rounded-xl p-4 mb-3 break-inside-avoid">
        <div class="flex items-start justify-between mb-2">
          <div>
            <div class="text-sm text-stone-500">Stop #{{ s.sequence }}</div>
            <div class="font-semibold text-stone-900">{{ s.order?.contactName }}</div>
            <div class="text-sm text-stone-600">{{ s.order?.contactPhone }}</div>
            <div class="text-sm text-stone-600">{{ s.order?.deliveryAddress }}</div>
          </div>
          <div class="text-right">
            <div class="font-mono text-sm">{{ s.order?.orderNumber }}</div>
            <div class="text-sm font-semibold">RM {{ Number(s.order?.total || 0).toFixed(2) }}</div>
            <span class="text-xs px-2 py-0.5 rounded mt-1 inline-block" :class="stopBadge(s.status)">{{ s.status }}</span>
          </div>
        </div>

        <div class="text-xs text-stone-600 space-y-0.5">
          <div v-if="s.arrivedAt">Arrived: {{ fmtDT(s.arrivedAt) }}</div>
          <div v-if="s.deliveredAt">Delivered: {{ fmtDT(s.deliveredAt) }}</div>
          <div v-if="s.receivedByName">Received by: <b>{{ s.receivedByName }}</b></div>
          <div v-if="s.failureReason" class="text-red-600">Reason: {{ s.failureReason }}</div>
          <div v-if="s.notes" class="italic">Notes: {{ s.notes }}</div>
        </div>

        <div v-if="(s.order as any)?.lines?.length" class="mt-2 text-xs">
          <div class="text-stone-500 font-semibold uppercase tracking-wider mb-1">Items</div>
          <div v-for="l in (s.order as any).lines" :key="l.id" class="flex justify-between border-b border-stone-100 py-1">
            <span>{{ l.itemName }} ({{ l.quantity }} {{ l.unit }})</span>
            <span class="text-stone-500">RM {{ Number(l.lineTotal).toFixed(2) }}</span>
          </div>
        </div>

        <div v-if="s.proofPhotoUrl || s.signatureDataUrl" class="mt-3 flex gap-3 flex-wrap">
          <div v-if="s.proofPhotoUrl">
            <div class="text-xs text-stone-500 mb-1">Proof photo</div>
            <img :src="s.proofPhotoUrl" class="max-h-28 rounded border border-stone-200" />
          </div>
          <div v-if="s.signatureDataUrl">
            <div class="text-xs text-stone-500 mb-1">Signature</div>
            <img :src="s.signatureDataUrl" class="max-h-20 bg-white rounded border border-stone-200" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Printer } from 'lucide-vue-next'
import { useDeliveryStore } from '../../stores/delivery'
import type { DeliveryTrip } from '../../types'

const store = useDeliveryStore()
const route = useRoute()
const trip = ref<DeliveryTrip | null>(null)

async function load() {
  trip.value = await store.fetchTripDetail(route.params.id as string)
}

const tripBadge = computed(() => {
  const s = trip.value?.status
  if (s === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700'
  if (s === 'COMPLETED') return 'bg-green-100 text-green-700'
  if (s === 'CANCELLED') return 'bg-red-100 text-red-700'
  return 'bg-stone-100 text-stone-700'
})

function stopBadge(s: string) {
  if (s === 'DELIVERED') return 'bg-green-100 text-green-700'
  if (s === 'FAILED') return 'bg-red-100 text-red-700'
  if (s === 'ARRIVED') return 'bg-amber-100 text-amber-700'
  if (s === 'SKIPPED') return 'bg-stone-100 text-stone-500'
  return 'bg-stone-100 text-stone-700'
}

function fmtDate(d?: string | null) { if (!d) return ''; try { return new Date(d).toLocaleDateString() } catch { return d || '' } }
function fmtDT(d?: string | null) { if (!d) return '-'; try { return new Date(d).toLocaleString() } catch { return d || '' } }
function print() { window.print() }

onMounted(load)
</script>
