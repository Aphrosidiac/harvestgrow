<template>
  <div class="max-w-md mx-auto p-4 pb-24 space-y-4">
    <RouterLink to="/driver" class="text-sm text-green-700 underline inline-flex items-center gap-1">
      <ChevronLeft class="w-4 h-4" /> Back
    </RouterLink>

    <div v-if="!trip" class="text-stone-500 text-sm">Loading...</div>

    <template v-else>
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <div>
            <div class="text-lg font-semibold text-stone-900">{{ trip.slot }} Trip</div>
            <div class="text-xs text-stone-500">{{ deliveredCount }} of {{ trip.stops?.length ?? 0 }} delivered</div>
          </div>
          <span class="text-xs px-2 py-1 rounded" :class="tripBadge">{{ trip.status }}</span>
        </div>
        <div class="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
          <div class="h-full bg-green-600 transition-all" :style="{ width: progressPct + '%' }" />
        </div>
        <div v-if="nextStopMapsUrl" class="mt-3">
          <a :href="nextStopMapsUrl" target="_blank" rel="noopener" class="text-sm text-green-700 underline inline-flex items-center gap-1">
            <MapPin class="w-4 h-4" /> Open next stop in Maps
          </a>
        </div>
      </div>

      <div v-if="allDone" class="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
        <CheckCircle class="w-14 h-14 text-green-600 mx-auto mb-2" />
        <h2 class="text-xl font-bold text-green-800">Trip Complete!</h2>
        <p class="text-sm text-green-700 mt-1">Great work. All stops are handled.</p>
        <RouterLink to="/driver" class="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 py-3 font-semibold min-h-[56px]">
          Back to Home
        </RouterLink>
      </div>

      <div v-for="stop in trip.stops || []" :key="stop.id" class="space-y-2">
        <StopCard :stop="stop" />
        <div v-if="!isTerminal(stop.status)" class="grid grid-cols-2 gap-2">
          <button
            @click="arrive(stop.id)"
            :disabled="stop.status === 'ARRIVED'"
            class="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg py-3 font-semibold min-h-[56px]"
          >
            Arrived
          </button>
          <button
            @click="openDeliver(stop)"
            class="bg-green-600 hover:bg-green-700 text-white rounded-lg py-3 font-semibold min-h-[56px]"
          >
            Delivered
          </button>
          <button
            @click="openFail(stop)"
            class="bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 font-semibold min-h-[56px]"
          >
            Failed
          </button>
          <button
            @click="skip(stop.id)"
            class="bg-stone-400 hover:bg-stone-500 text-white rounded-lg py-3 font-semibold min-h-[56px]"
          >
            Skip
          </button>
        </div>
        <div v-else-if="stop.status === 'DELIVERED'" class="text-xs text-stone-600 pl-2">
          Received by {{ stop.receivedByName }} · {{ fmt(stop.deliveredAt) }}
        </div>
        <div v-else-if="stop.status === 'FAILED'" class="text-xs text-red-600 pl-2">
          Failed: {{ stop.failureReason }}
        </div>
      </div>
    </template>

    <!-- Delivered sheet -->
    <div v-if="deliverStop" class="fixed inset-0 z-50 flex items-end">
      <div class="absolute inset-0 bg-black/60" @click="deliverStop = null" />
      <div class="relative w-full bg-white rounded-t-2xl p-4 max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">Confirm Delivery</h3>
          <button @click="deliverStop = null" class="text-stone-500"><X class="w-5 h-5" /></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Received by (name)</label>
            <input v-model="receivedByName" type="text" class="w-full rounded-lg border border-stone-300 px-3 py-3 text-base" placeholder="Recipient name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Signature</label>
            <SignaturePad v-model="signatureDataUrl" />
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Photo (optional)</label>
            <PhotoCapture v-model="proofPhotoUrl" />
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Notes (optional)</label>
            <textarea v-model="deliverNotes" rows="2" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"></textarea>
          </div>
          <button
            @click="submitDelivered"
            :disabled="!canSubmitDelivery || saving"
            class="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg py-4 font-semibold min-h-[56px]"
          >
            {{ saving ? 'Saving...' : 'Confirm Delivered' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Failed sheet -->
    <div v-if="failStop" class="fixed inset-0 z-50 flex items-end">
      <div class="absolute inset-0 bg-black/60" @click="failStop = null" />
      <div class="relative w-full bg-white rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">Mark as Failed</h3>
          <button @click="failStop = null" class="text-stone-500"><X class="w-5 h-5" /></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Reason</label>
            <select v-model="failReason" class="w-full rounded-lg border border-stone-300 px-3 py-3 text-base">
              <option value="">Choose...</option>
              <option>Recipient not available</option>
              <option>Wrong address</option>
              <option>Recipient refused</option>
              <option>Vehicle issue</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-stone-700 mb-1">Notes (optional)</label>
            <textarea v-model="failNotes" rows="2" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"></textarea>
          </div>
          <button
            @click="submitFailed"
            :disabled="!failReason || saving"
            class="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg py-4 font-semibold min-h-[56px]"
          >
            Confirm Failed
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronLeft, X, CheckCircle, MapPin } from 'lucide-vue-next'
import { useDeliveryStore } from '../../stores/delivery'
import SignaturePad from '../../components/delivery/SignaturePad.vue'
import PhotoCapture from '../../components/delivery/PhotoCapture.vue'
import StopCard from '../../components/delivery/StopCard.vue'
import type { DeliveryStop, DeliveryTrip } from '../../types'

const route = useRoute()
const store = useDeliveryStore()
const trip = ref<DeliveryTrip | null>(null)
const saving = ref(false)

const deliverStop = ref<DeliveryStop | null>(null)
const failStop = ref<DeliveryStop | null>(null)
const receivedByName = ref('')
const signatureDataUrl = ref('')
const proofPhotoUrl = ref('')
const deliverNotes = ref('')
const failReason = ref('')
const failNotes = ref('')

async function load() {
  const id = route.params.id as string
  const data = await store.fetchTripDetail(id)
  trip.value = data
}

const deliveredCount = computed(() => (trip.value?.stops || []).filter((s) => s.status === 'DELIVERED').length)
const progressPct = computed(() => {
  const total = trip.value?.stops?.length ?? 0
  return total ? Math.round((deliveredCount.value / total) * 100) : 0
})
const allDone = computed(() => {
  const stops = trip.value?.stops || []
  return stops.length > 0 && stops.every((s) => isTerminal(s.status))
})
const tripBadge = computed(() => {
  const s = trip.value?.status
  if (s === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700'
  if (s === 'COMPLETED') return 'bg-green-100 text-green-700'
  if (s === 'CANCELLED') return 'bg-red-100 text-red-700'
  return 'bg-stone-100 text-stone-700'
})

const nextStopMapsUrl = computed(() => {
  const next = (trip.value?.stops || []).find((s) => s.status === 'PENDING' || s.status === 'ARRIVED')
  if (!next?.order?.deliveryAddress) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(next.order.deliveryAddress)}`
})

function isTerminal(s: string) {
  return s === 'DELIVERED' || s === 'FAILED' || s === 'SKIPPED'
}

async function arrive(stopId: string) {
  await store.stopArrived(stopId)
  await load()
}

function openDeliver(stop: DeliveryStop) {
  deliverStop.value = stop
  receivedByName.value = ''
  signatureDataUrl.value = ''
  proofPhotoUrl.value = ''
  deliverNotes.value = ''
}
function openFail(stop: DeliveryStop) {
  failStop.value = stop
  failReason.value = ''
  failNotes.value = ''
}

const canSubmitDelivery = computed(() => !!receivedByName.value.trim() && !!signatureDataUrl.value)

async function submitDelivered() {
  if (!deliverStop.value || !canSubmitDelivery.value) return
  saving.value = true
  try {
    await store.stopDelivered(deliverStop.value.id, {
      receivedByName: receivedByName.value.trim(),
      signatureDataUrl: signatureDataUrl.value,
      proofPhotoUrl: proofPhotoUrl.value || undefined,
      notes: deliverNotes.value || undefined,
    })
    deliverStop.value = null
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Failed to confirm delivery')
  } finally { saving.value = false }
}

async function submitFailed() {
  if (!failStop.value || !failReason.value) return
  saving.value = true
  try {
    await store.stopFailed(failStop.value.id, {
      failureReason: failReason.value,
      notes: failNotes.value || undefined,
    })
    failStop.value = null
    await load()
  } finally { saving.value = false }
}

async function skip(stopId: string) {
  if (!confirm('Skip this stop?')) return
  await store.stopSkipped(stopId)
  await load()
}

function fmt(d?: string | null) { if (!d) return ''; try { return new Date(d).toLocaleTimeString() } catch { return '' } }

onMounted(load)
</script>
