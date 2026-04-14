<template>
  <div class="p-8 max-w-3xl mx-auto text-stone-900 bg-white min-h-screen" style="font-family: system-ui, sans-serif;">
    <div v-if="!data" class="text-stone-500">Loading...</div>
    <div v-else>
      <header class="flex items-center justify-between border-b-2 border-stone-900 pb-4 mb-6">
        <div>
          <img src="/logo-sidebar.png" alt="HarvestGrow" class="h-16 mb-2" />
          <h1 class="text-2xl font-bold">PACK SHEET</h1>
        </div>
        <div class="text-right text-sm">
          <div class="text-2xl font-mono font-bold">{{ data.order.orderNumber }}</div>
          <div>{{ fmtDate(data.order.deliveryDate) }}</div>
          <div class="font-semibold">Slot: {{ data.order.deliverySlot }}</div>
        </div>
      </header>

      <section class="mb-4 text-sm">
        <div class="font-semibold">Customer</div>
        <div>{{ data.order.contactName }} — {{ data.order.contactPhone }}</div>
        <div class="text-stone-600">{{ data.order.deliveryAddress }}</div>
      </section>

      <section class="mb-6">
        <h2 class="font-semibold text-sm uppercase border-b border-stone-300 pb-1 mb-2">Items</h2>
        <table class="w-full text-sm">
          <thead class="text-xs text-stone-600">
            <tr>
              <th class="text-left py-1">Qty</th>
              <th class="text-left py-1">Unit</th>
              <th class="text-left py-1">Item</th>
              <th class="text-left py-1">Cut</th>
              <th class="text-left py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in data.order.lines" :key="l.id" class="border-t border-stone-200">
              <td class="py-2 font-bold text-base">{{ l.quantity }}</td>
              <td class="py-2">{{ l.unit }}</td>
              <td class="py-2">{{ l.itemName }}</td>
              <td class="py-2 text-stone-600">{{ l.cutStyle || '—' }}</td>
              <td class="py-2 text-stone-600 italic">{{ l.notes || '' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="data.order.notes" class="mb-6 border border-stone-300 rounded p-3 bg-stone-50">
        <div class="text-xs font-semibold uppercase text-stone-600 mb-1">Customer Notes</div>
        <p class="text-sm">{{ data.order.notes }}</p>
      </section>

      <section class="mb-6">
        <h2 class="font-semibold text-sm uppercase border-b border-stone-300 pb-1 mb-2">Aggregated Prep</h2>
        <div v-for="(items, cat) in data.cutAggregates" :key="cat" class="mb-2">
          <div class="text-xs font-semibold text-stone-700">{{ cat }}</div>
          <ul class="text-sm ml-4 list-disc">
            <li v-for="(it, idx) in items" :key="idx">{{ it.totalQty }} {{ it.unit }} — {{ it.itemName }}</li>
          </ul>
        </div>
      </section>

      <footer class="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div class="border-t border-stone-900 pt-1">Packed by</div>
        </div>
        <div>
          <div class="border-t border-stone-900 pt-1">Checked by</div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useProductionStore } from '../../stores/production'

const route = useRoute()
const store = useProductionStore()
const data = ref<any>(null)

function fmtDate(d: string) { try { return new Date(d).toLocaleDateString() } catch { return d } }

onMounted(async () => {
  data.value = await store.fetchPackSheet(route.params.id as string)
  if (route.query.preview !== '1') {
    setTimeout(() => window.print(), 500)
  }
})
</script>
