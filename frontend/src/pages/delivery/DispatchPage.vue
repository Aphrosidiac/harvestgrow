<template>
  <div>
    <!-- Alerts strip -->
    <div
      v-if="alertCount > 0"
      class="bg-red-50 border border-red-300 text-red-800 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3 text-sm"
    >
      <AlertTriangle class="w-5 h-5 text-red-600" />
      <span class="font-semibold">Delivery alerts:</span>
      <span v-if="store.alerts.unassigned.length">{{ store.alerts.unassigned.length }} unassigned READY</span>
      <span v-if="store.alerts.overdue.length">· {{ store.alerts.overdue.length }} overdue</span>
      <span v-if="store.alerts.failed.length">· {{ store.alerts.failed.length }} failed</span>
    </div>

    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <h1 class="text-xl font-semibold text-stone-900">Delivery Dispatch</h1>
      <input type="date" v-model="date" class="rounded-lg border border-stone-200 text-sm px-2 py-1" />
      <button @click="refresh" class="ml-auto bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5">
        <RefreshCw class="w-4 h-4" /> Refresh
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Unassigned READY orders -->
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <h2 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">Unassigned READY Orders</h2>

        <div v-for="slot in ['AM', 'PM']" :key="slot" class="mb-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-semibold px-2 py-0.5 rounded" :class="slot === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'">{{ slot }}</span>
            <span class="text-xs text-stone-500">{{ (store.readyGrouped[slot] || []).length }} orders</span>
          </div>

          <div v-for="o in store.readyGrouped[slot] || []" :key="o.id"
            class="flex items-start gap-2 border border-stone-200 rounded-lg p-2 mb-2 text-sm"
          >
            <input type="checkbox" :value="o.id" v-model="selectedOrderIds" class="mt-1" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="font-mono font-semibold">{{ o.orderNumber }}</span>
                <span class="text-xs text-stone-700">RM {{ o.total.toFixed(2) }}</span>
              </div>
              <div class="text-stone-700">{{ o.contactName }} · {{ o.contactPhone }}</div>
              <div class="text-xs text-stone-500 truncate">{{ o.deliveryAddress }}</div>
              <div class="flex gap-1 mt-1 flex-wrap">
                <span v-if="o.perishableCount > 0" class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{{ o.perishableCount }} perishable</span>
                <span class="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded">{{ o.lineCount }} items</span>
              </div>
            </div>
          </div>

          <div v-if="!(store.readyGrouped[slot] || []).length" class="text-xs text-stone-400 py-2">No unassigned {{ slot }} orders.</div>
        </div>

        <!-- Assignment controls -->
        <div class="border-t border-stone-200 pt-3 mt-3 space-y-2">
          <div class="text-xs text-stone-600">{{ selectedOrderIds.length }} selected</div>
          <div class="flex flex-wrap gap-2 items-center">
            <select v-model="assignDriverId" class="rounded-lg border border-stone-200 text-sm px-2 py-1.5">
              <option value="">Select driver...</option>
              <option v-for="d in store.drivers" :key="d.id" :value="d.id">{{ d.user?.name }}{{ d.vehiclePlate ? ` (${d.vehiclePlate})` : '' }}</option>
            </select>
            <select v-model="assignSlot" class="rounded-lg border border-stone-200 text-sm px-2 py-1.5">
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
            <button
              @click="assignToTrip"
              :disabled="!canAssign"
              class="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg px-3 py-1.5 text-sm"
            >Add to Trip</button>
          </div>
        </div>
      </div>

      <!-- Today's Trips -->
      <div class="bg-white border border-stone-200 rounded-xl p-4">
        <h2 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-3">Today's Trips</h2>
        <div v-if="!store.trips.length" class="text-xs text-stone-400 py-2">No trips yet for this date.</div>
        <div v-for="t in store.trips" :key="t.id"
          class="border border-stone-200 rounded-lg p-3 mb-3 cursor-pointer hover:border-green-600"
          @click="openTrip(t.id)"
        >
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold text-stone-900">{{ t.driver?.user?.name }}</div>
              <div class="text-xs text-stone-500">{{ t.driver?.vehiclePlate || '—' }} · {{ t.slot }}</div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded" :class="tripBadge(t.status)">{{ t.status }}</span>
          </div>
          <div class="mt-2 text-xs text-stone-600">
            {{ t.completedStops ?? 0 }} / {{ t.totalStops ?? 0 }} delivered
          </div>
          <div class="flex flex-wrap gap-1 mt-2">
            <span v-for="s in t.stops || []" :key="s.id" class="text-[10px] font-mono px-1.5 py-0.5 rounded" :class="stopBadge(s.status)">
              #{{ s.sequence }} {{ s.order?.orderNumber }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Trip drawer -->
    <div v-if="drawerTripId" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-black/40" @click="drawerTripId = null" />
      <div class="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl p-5">
        <TripDrawer :trip-id="drawerTripId" @close="drawerTripId = null" @changed="refresh" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RefreshCw, AlertTriangle } from 'lucide-vue-next'
import { useDeliveryStore } from '../../stores/delivery'
import TripDrawer from './TripDrawer.vue'

const store = useDeliveryStore()
const date = ref(new Date().toISOString().slice(0, 10))
const selectedOrderIds = ref<string[]>([])
const assignDriverId = ref('')
const assignSlot = ref('AM')
const drawerTripId = ref<string | null>(null)

const alertCount = computed(() => store.alerts.unassigned.length + store.alerts.overdue.length + store.alerts.failed.length)
const canAssign = computed(() => !!assignDriverId.value && selectedOrderIds.value.length > 0)

async function refresh() {
  await Promise.all([
    store.fetchReadyOrders(date.value),
    store.fetchTrips(date.value),
    store.fetchDrivers(),
    store.fetchAlerts(date.value),
  ])
}

async function assignToTrip() {
  if (!canAssign.value) return
  try {
    await store.createTrip({
      driverId: assignDriverId.value,
      date: date.value,
      slot: assignSlot.value,
      orderIds: selectedOrderIds.value,
    })
    selectedOrderIds.value = []
    await refresh()
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Failed to assign')
  }
}

function openTrip(id: string) { drawerTripId.value = id }

function tripBadge(s: string) {
  if (s === 'IN_PROGRESS') return 'bg-amber-100 text-amber-700'
  if (s === 'COMPLETED') return 'bg-green-100 text-green-700'
  if (s === 'CANCELLED') return 'bg-red-100 text-red-700'
  return 'bg-stone-100 text-stone-700'
}
function stopBadge(s: string) {
  if (s === 'DELIVERED') return 'bg-green-100 text-green-700'
  if (s === 'FAILED') return 'bg-red-100 text-red-700'
  if (s === 'ARRIVED') return 'bg-amber-100 text-amber-700'
  if (s === 'SKIPPED') return 'bg-stone-100 text-stone-500'
  return 'bg-stone-100 text-stone-700'
}

watch(date, refresh)
onMounted(refresh)
</script>
