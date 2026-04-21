<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-semibold text-olive mb-6">Your cart</h1>
    <div v-if="cart.lines.length === 0" class="py-16 text-center">
      <p class="text-stone-500 mb-4">Your cart is empty.</p>
      <div class="flex flex-wrap gap-3 justify-center">
        <RouterLink to="/shop" class="bg-olive text-white px-6 py-2.5 rounded-full">Browse produce</RouterLink>
        <RouterLink to="/quick-order" class="border border-olive text-olive px-6 py-2.5 rounded-full">Use Quick Order</RouterLink>
      </div>
    </div>
    <div v-else class="grid md:grid-cols-3 gap-6">
      <div class="md:col-span-2 space-y-3">
        <div
          v-for="(line, idx) in cart.lines"
          :key="idx"
          class="bg-white rounded-2xl border border-stone-200 p-4 flex gap-4 items-center"
        >
          <div class="w-16 h-16 shrink-0 bg-cream rounded-xl flex items-center justify-center overflow-hidden">
            <img v-if="line.imageUrl" :src="line.imageUrl" class="w-full h-full object-cover" @error="(e: any) => (e.target.style.display = 'none')" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-stone-800 truncate">{{ line.itemName }}</div>
            <div class="text-xs text-stone-500">
              RM {{ line.unitPrice.toFixed(2) }} / {{ line.unit }}
            </div>
            <!-- Cut style editable -->
            <div v-if="cutOptionsFor(line).length" class="mt-1 relative inline-block">
              <button
                type="button"
                class="text-xs inline-flex items-center gap-1 text-olive bg-olive/10 px-2 py-0.5 rounded-full"
                @click="toggleCutMenu(idx)"
              >
                {{ line.cutStyle || 'Select cut' }}
                <ChevronDown class="w-3 h-3" />
              </button>
              <div v-if="openCutIdx === idx" class="absolute z-10 mt-1 bg-white border border-stone-200 rounded-xl shadow-md py-1 min-w-[120px]">
                <button
                  v-for="opt in cutOptionsFor(line)"
                  :key="opt"
                  type="button"
                  class="block w-full text-left px-3 py-1 text-sm hover:bg-cream"
                  :class="opt === line.cutStyle ? 'text-olive font-medium' : ''"
                  @click="pickCut(idx, opt)"
                >{{ opt }}</button>
              </div>
            </div>
            <div v-if="line.notes" class="text-xs text-stone-400 mt-1">{{ line.notes }}</div>
          </div>
          <QtyStepper
            :model-value="line.quantity"
            :min="0"
            :step="line.unit === 'kg' ? 0.5 : 1"
            @update:model-value="(v: number) => cart.updateQty(idx, v)"
          />
          <div class="text-sm font-medium w-20 text-right">RM {{ (line.unitPrice * line.quantity).toFixed(2) }}</div>
          <button class="text-stone-400 hover:text-red-500" @click="cart.removeLine(idx)">
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>
      <div>
        <div class="bg-white rounded-2xl border border-stone-200 p-5 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-stone-500">Subtotal</span>
            <span>RM {{ cart.subtotal.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-stone-500">Delivery</span>
            <span>FREE</span>
          </div>
          <div v-if="minOrder > 0" class="text-xs text-stone-500 pt-1">
            Minimum order RM {{ minOrder.toFixed(2) }}
          </div>
          <div v-if="belowMin" class="text-xs text-red-600">
            Add RM {{ (minOrder - cart.subtotal).toFixed(2) }} more to reach minimum
          </div>
          <div class="flex justify-between text-base font-semibold border-t border-stone-200 pt-2 mt-2">
            <span>Total</span>
            <span class="text-olive">RM {{ cart.subtotal.toFixed(2) }}</span>
          </div>
          <RouterLink
            v-if="!belowMin"
            to="/checkout"
            class="block text-center bg-olive text-white rounded-full py-3 font-medium mt-4 hover:bg-[var(--color-olive-dark)] transition-colors"
          >Checkout</RouterLink>
          <button
            v-else
            type="button"
            disabled
            class="block w-full text-center bg-stone-300 text-white rounded-full py-3 font-medium mt-4 cursor-not-allowed"
          >Checkout</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { X, ChevronDown } from 'lucide-vue-next'
import { useCartStore, type CartLine } from '../../stores/cart'
import { useShopStore } from '../../stores/shop'
import QtyStepper from '../../components/shop/QtyStepper.vue'
import shopApi from '../../lib/shop-api'

const cart = useCartStore()
const shop = useShopStore()
const openCutIdx = ref<number | null>(null)
const minOrder = ref(0)

function toggleCutMenu(i: number) { openCutIdx.value = openCutIdx.value === i ? null : i }
function pickCut(i: number, opt: string) {
  cart.updateCutStyle(i, opt)
  openCutIdx.value = null
}

function cutOptionsFor(line: CartLine): string[] {
  const prod = shop.products.find((p) => p.id === line.stockItemId)
  return prod?.cutOptions || []
}

const belowMin = computed(() => minOrder.value > 0 && cart.subtotal < minOrder.value)

onMounted(async () => {
  // Ensure products loaded so we know cutOptions per line
  if (shop.products.length === 0) await shop.fetchProducts().catch(() => {})
  try {
    const { data } = await shopApi.get('/settings')
    const v = data.data?.['shop.minOrderAmount']
    if (v) minOrder.value = Number(v) || 0
  } catch { /* noop */ }
})
</script>
