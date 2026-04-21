<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-semibold text-olive mb-2">Quick Order</h1>
    <p class="text-sm text-stone-500 mb-6">Reorder past orders or build a bulk order fast.</p>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-stone-200">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="tab === 'reorder' ? 'border-olive text-olive' : 'border-transparent text-stone-500 hover:text-olive'"
        @click="tab = 'reorder'"
      >Reorder past order</button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
        :class="tab === 'quickadd' ? 'border-olive text-olive' : 'border-transparent text-stone-500 hover:text-olive'"
        @click="tab = 'quickadd'"
      >Add by name/code</button>
    </div>

    <!-- Reorder tab -->
    <div v-if="tab === 'reorder'">
      <div v-if="loadingOrders" class="py-8 text-center text-stone-500">Loading...</div>
      <div v-else-if="recentOrders.length === 0" class="py-8 text-center text-stone-500">
        No recent orders yet. Place an order and it'll appear here.
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="o in recentOrders"
          :key="o.orderNumber"
          class="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-4"
        >
          <div class="flex-1 min-w-0">
            <div class="font-medium">{{ o.orderNumber }}</div>
            <div class="text-xs text-stone-500">
              {{ formatDate(o.createdAt) }} · RM {{ Number(o.total).toFixed(2) }}
              <span v-if="o.lines"> · {{ o.lines.length }} items</span>
            </div>
          </div>
          <button
            class="bg-olive text-white rounded-full px-4 py-2 text-sm font-medium hover:bg-[var(--color-olive-dark)]"
            @click="reorder(o)"
          >Reorder</button>
        </div>
      </div>
    </div>

    <!-- Quick-add tab -->
    <div v-else>
      <div class="space-y-3">
        <div
          v-for="(row, i) in rows"
          :key="i"
          class="bg-white rounded-2xl border border-stone-200 p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
        >
          <div class="md:col-span-5 relative">
            <input
              v-model="row.query"
              placeholder="Search product..."
              class="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30"
              @focus="row.focused = true"
              @blur="() => setTimeout(() => (row.focused = false), 200)"
            />
            <div v-if="row.focused && row.query && matches(row.query).length" class="absolute z-10 top-full mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-md max-h-60 overflow-auto">
              <button
                v-for="p in matches(row.query)"
                :key="p.id"
                type="button"
                class="block w-full text-left px-3 py-2 text-sm hover:bg-cream"
                @click="pick(i, p)"
              >
                <div class="font-medium">{{ p.name }}</div>
                <div class="text-xs text-stone-500">RM {{ p.sellPrice.toFixed(2) }} / {{ p.unit }}</div>
              </button>
            </div>
          </div>
          <input
            v-model.number="row.qty"
            type="number"
            min="0"
            step="0.5"
            class="md:col-span-2 rounded-xl border border-stone-200 px-3 py-2 text-sm"
            placeholder="Qty"
          />
          <div class="md:col-span-2 text-xs text-stone-500">
            {{ row.product?.unit || '-' }}
          </div>
          <select
            v-model="row.cutStyle"
            :disabled="!row.product?.cutOptions?.length"
            class="md:col-span-2 rounded-xl border border-stone-200 px-2 py-2 text-sm disabled:bg-stone-50 disabled:text-stone-400"
          >
            <option :value="undefined">No cut</option>
            <option v-for="opt in row.product?.cutOptions || []" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <button
            type="button"
            class="md:col-span-1 text-stone-400 hover:text-red-500 justify-self-end"
            aria-label="Remove"
            @click="rows.splice(i, 1)"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>
      <div class="flex gap-3 mt-4">
        <button type="button" class="border border-stone-300 rounded-full px-4 py-2 text-sm" @click="addRow">+ Add another row</button>
        <button type="button" class="bg-olive text-white rounded-full px-6 py-2 text-sm font-medium ml-auto" @click="addAllToCart">
          Add all to cart
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'
import { useShopStore } from '../../stores/shop'
import { useCartStore } from '../../stores/cart'
import shopApi from '../../lib/shop-api'
import type { ShopProduct } from '../../types'

const shop = useShopStore()
const cart = useCartStore()
const router = useRouter()

const tab = ref<'reorder' | 'quickadd'>('reorder')
const loadingOrders = ref(false)
const recentOrders = ref<any[]>([])

interface Row { query: string; qty: number; product?: ShopProduct; cutStyle?: string; focused: boolean }
const rows = reactive<Row[]>([{ query: '', qty: 1, focused: false }])

function addRow() { rows.push({ query: '', qty: 1, focused: false }) }

function matches(q: string): ShopProduct[] {
  const qq = q.toLowerCase()
  return shop.products.filter((p) => p.name.toLowerCase().includes(qq)).slice(0, 8)
}

function pick(i: number, p: ShopProduct) {
  rows[i].product = p
  rows[i].query = p.name
  rows[i].cutStyle = p.cutOptions?.[0]
  rows[i].focused = false
  if ((p.unit || '').toLowerCase() === 'kg' && rows[i].qty < 0.5) rows[i].qty = 0.5
}

function addAllToCart() {
  let added = 0
  for (const r of rows) {
    if (!r.product || !r.qty || r.qty <= 0) continue
    cart.addLine({
      stockItemId: r.product.id,
      itemName: r.product.name,
      imageUrl: r.product.imageUrl,
      unit: r.product.unit,
      unitPrice: r.product.sellPrice,
      quantity: r.qty,
      cutStyle: r.cutStyle,
    })
    added++
  }
  if (added > 0) router.push('/cart')
}

function reorder(order: any) {
  const lines = order.lines || []
  for (const l of lines) {
    const prod = shop.products.find((p) => p.id === l.stockItemId)
    cart.addLine({
      stockItemId: l.stockItemId,
      itemName: l.itemName,
      imageUrl: prod?.imageUrl,
      unit: l.unit,
      unitPrice: Number(l.unitPrice),
      quantity: Number(l.quantity),
      cutStyle: l.cutStyle || undefined,
    })
  }
  router.push('/cart')
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString() } catch { return d }
}

async function loadRecent() {
  loadingOrders.value = true
  try {
    if (shop.shopToken) {
      const { data } = await shopApi.get('/me/orders')
      recentOrders.value = data.data || []
    } else {
      // Guest fallback
      const raw = localStorage.getItem('hg_recent_orders')
      const list = raw ? JSON.parse(raw) : []
      // Try to fetch each to get lines
      const results: any[] = []
      for (const e of list.slice(0, 5)) {
        try {
          const { data } = await shopApi.get(`/orders/${e.orderNumber}`, { params: { phone: e.phone } })
          results.push(data.data)
        } catch { /* skip */ }
      }
      recentOrders.value = results
    }
  } catch { recentOrders.value = [] }
  finally { loadingOrders.value = false }
}

onMounted(async () => {
  if (shop.products.length === 0) await shop.fetchProducts().catch(() => {})
  await loadRecent()
})
</script>
