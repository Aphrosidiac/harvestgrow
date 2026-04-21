<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-semibold text-olive mb-6">Checkout</h1>
    <div v-if="cart.lines.length === 0" class="py-16 text-center text-stone-500">
      Your cart is empty. <RouterLink to="/shop" class="text-olive underline">Start shopping</RouterLink>.
    </div>
    <form v-else class="grid lg:grid-cols-3 gap-6" @submit.prevent="submit">
      <div class="lg:col-span-2 space-y-4">
        <!-- Cutoff banner -->
        <div
          v-if="shop.cutoff"
          class="rounded-2xl border px-4 py-3 text-sm"
          :class="shop.cutoff.isPastCutoff
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'"
        >
          <template v-if="shop.cutoff.isPastCutoff">
            Cutoff ({{ shop.cutoff.cutoffTime }}) has passed — delivery will be tomorrow, {{ shop.cutoff.nextDeliveryDate }}.
          </template>
          <template v-else>
            Order before {{ shop.cutoff.cutoffTime }} for same-day delivery on {{ shop.cutoff.nextDeliveryDate }}.
          </template>
        </div>

        <!-- Contact -->
        <div class="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
          <h2 class="font-semibold">Contact</h2>
          <input v-model="form.name" required placeholder="Full name" class="input" />
          <input v-model="form.phone" required placeholder="Phone (e.g. +60...)" class="input" />
          <input v-model="form.email" type="email" placeholder="Email (optional)" class="input" />
        </div>

        <!-- Delivery -->
        <div class="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
          <h2 class="font-semibold">Delivery</h2>
          <textarea v-model="form.address" required rows="3" placeholder="Delivery address" class="input" />
          <div>
            <label class="block text-sm font-medium mb-1">Postcode <span class="text-red-500">*</span></label>
            <input
              v-model="form.postcode"
              required
              placeholder="e.g. 81200"
              class="input"
              :class="postcodeInvalid ? 'border-red-300' : ''"
              @blur="validatePostcode"
            />
            <p v-if="postcodeInvalid" class="text-red-600 text-xs mt-1">
              Sorry, we don't deliver to {{ form.postcode }} yet.
              <a :href="whatsappLink" target="_blank" class="underline">WhatsApp us</a> for special arrangement.
            </p>
          </div>
          <div>
            <div class="text-sm font-medium mb-1">Time slot</div>
            <div class="flex gap-2">
              <button type="button" class="slot" :class="form.slot === 'AM' ? 'slot-active' : ''" @click="form.slot = 'AM'">AM (9am – 12pm)</button>
              <button type="button" class="slot" :class="form.slot === 'PM' ? 'slot-active' : ''" @click="form.slot = 'PM'">PM (2pm – 6pm)</button>
            </div>
          </div>
          <textarea v-model="form.notes" rows="2" placeholder="Order notes (optional)" class="input" />
        </div>

        <!-- Account -->
        <div class="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" v-model="form.createAccount" />
            Create an account for faster reordering
          </label>
          <input
            v-if="form.createAccount"
            v-model="form.password"
            type="password"
            placeholder="Password (min 6 chars)"
            minlength="6"
            class="input"
          />
        </div>
      </div>

      <div>
        <div class="bg-white rounded-2xl border border-stone-200 p-5 sticky top-20">
          <h2 class="font-semibold mb-3">Order summary</h2>
          <div class="space-y-2 max-h-64 overflow-auto">
            <div v-for="(l, i) in cart.lines" :key="i" class="flex justify-between text-sm">
              <span class="truncate pr-2">
                {{ l.itemName }}
                <span v-if="l.cutStyle" class="text-olive text-xs">· {{ l.cutStyle }}</span>
                <span class="text-stone-400 text-xs"> × {{ l.quantity }}</span>
              </span>
              <span class="shrink-0">RM {{ (l.unitPrice * l.quantity).toFixed(2) }}</span>
            </div>
          </div>
          <div class="border-t border-stone-200 mt-3 pt-3 space-y-1 text-sm">
            <div class="flex justify-between"><span class="text-stone-500">Subtotal</span><span>RM {{ cart.subtotal.toFixed(2) }}</span></div>
            <div class="flex justify-between"><span class="text-stone-500">Delivery</span><span>FREE</span></div>
            <div v-if="minOrder > 0" class="text-xs text-stone-500">Minimum order RM {{ minOrder.toFixed(2) }}</div>
            <div v-if="belowMin" class="text-xs text-red-600">Add RM {{ (minOrder - cart.subtotal).toFixed(2) }} more to reach minimum</div>
            <div class="flex justify-between font-semibold text-base mt-2">
              <span>Total (COD)</span><span class="text-olive">RM {{ cart.subtotal.toFixed(2) }}</span>
            </div>
          </div>
          <button
            type="submit"
            :disabled="submitting || belowMin || postcodeInvalid || !form.postcode"
            class="w-full mt-4 bg-green-600 text-white rounded-full py-3 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >{{ submitting ? 'Placing...' : 'Place order — COD' }}</button>
          <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
        </div>
      </div>
    </form>

    <!-- Price change modal -->
    <div v-if="priceModalOpen" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
        <h3 class="text-lg font-semibold text-olive">Prices have changed</h3>
        <p class="text-sm text-stone-600 mt-1">Some items in your cart have updated prices:</p>
        <div class="mt-4 space-y-2 max-h-80 overflow-auto">
          <div v-for="c in priceChanges" :key="c.stockItemId" class="flex items-center justify-between text-sm border-b border-stone-100 pb-2">
            <span class="truncate pr-2">{{ c.itemName }}</span>
            <span class="shrink-0">
              <span class="line-through text-stone-400">RM {{ c.oldPrice.toFixed(2) }}</span>
              <span class="mx-1">→</span>
              <span class="font-semibold text-olive">RM {{ c.newPrice.toFixed(2) }}</span>
              <span
                class="ml-2 text-xs"
                :class="c.newPrice > c.oldPrice ? 'text-red-500' : 'text-green-600'"
              >({{ c.newPrice > c.oldPrice ? '+' : '' }}{{ (((c.newPrice - c.oldPrice) / (c.oldPrice || 1)) * 100).toFixed(1) }}%)</span>
            </span>
          </div>
        </div>
        <div class="flex gap-2 mt-6">
          <button type="button" class="flex-1 border border-stone-300 rounded-full py-2" @click="priceModalOpen = false; cancelToCart()">Review cart</button>
          <button type="button" class="flex-1 bg-olive text-white rounded-full py-2" @click="confirmNewPrices">Confirm new prices</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useShopStore } from '../../stores/shop'
import { useCartStore } from '../../stores/cart'
import shopApi from '../../lib/shop-api'

const shop = useShopStore()
const cart = useCartStore()
const router = useRouter()

const form = reactive({
  name: '', phone: '', email: '',
  address: '', postcode: '', slot: 'AM' as 'AM' | 'PM', notes: '',
  createAccount: false, password: '',
})
const submitting = ref(false)
const error = ref<string | null>(null)
const minOrder = ref(0)
const serviceablePostcodes = ref<string[]>([])
const whatsappLink = ref('https://wa.me/60137779069')
const postcodeInvalid = ref(false)

const priceModalOpen = ref(false)
const priceChanges = ref<Array<{ stockItemId: string; itemName: string; oldPrice: number; newPrice: number }>>([])

const belowMin = computed(() => minOrder.value > 0 && cart.subtotal < minOrder.value)

function validatePostcode() {
  if (!form.postcode) { postcodeInvalid.value = false; return }
  if (serviceablePostcodes.value.length === 0) { postcodeInvalid.value = false; return }
  postcodeInvalid.value = !serviceablePostcodes.value.includes(form.postcode.trim())
}

onMounted(async () => {
  shop.fetchCutoff()
  try {
    const { data } = await shopApi.get('/settings')
    const s = data.data || {}
    minOrder.value = Number(s['shop.minOrderAmount'] || 0)
    const raw = s['shop.serviceable.postcodes'] || ''
    serviceablePostcodes.value = raw.split(',').map((x: string) => x.trim()).filter(Boolean)
    if (s['shop.whatsapp.link']) whatsappLink.value = s['shop.whatsapp.link']
  } catch { /* noop */ }
})

async function submit() {
  error.value = null
  validatePostcode()
  if (postcodeInvalid.value) return
  if (belowMin.value) { error.value = `Minimum order is RM ${minOrder.value.toFixed(2)}`; return }

  submitting.value = true
  try {
    // 1. Price check
    const pcPayload = { lines: cart.lines.map((l) => ({ stockItemId: l.stockItemId, clientUnitPrice: l.unitPrice })) }
    const { data: pcResp } = await shopApi.post('/price-check', pcPayload)
    const changed = pcResp?.data?.changed || []
    if (changed.length > 0) {
      priceChanges.value = changed
      priceModalOpen.value = true
      submitting.value = false
      return
    }
    await placeOrder()
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to place order'
    submitting.value = false
  }
}

async function confirmNewPrices() {
  // Update cart line prices
  for (const c of priceChanges.value) {
    const idx = cart.lines.findIndex((l) => l.stockItemId === c.stockItemId)
    if (idx >= 0) cart.lines[idx].unitPrice = c.newPrice
  }
  priceModalOpen.value = false
  submitting.value = true
  try { await placeOrder() }
  catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to place order'
    submitting.value = false
  }
}

function cancelToCart() {
  router.push('/cart')
}

async function placeOrder() {
  const payload: any = {
    contact: { name: form.name, phone: form.phone, email: form.email || undefined },
    deliveryAddress: form.address,
    deliveryPostcode: form.postcode || undefined,
    deliverySlot: form.slot,
    notes: form.notes || undefined,
    lines: cart.lines.map((l) => ({
      stockItemId: l.stockItemId, quantity: l.quantity, cutStyle: l.cutStyle, notes: l.notes,
    })),
  }
  if (form.createAccount && form.password.length >= 6) {
    payload.createAccount = { password: form.password }
  }
  try {
    const result = await shop.placeOrder(payload)
    // Persist recent order numbers for guests
    try {
      const raw = localStorage.getItem('hg_recent_orders')
      const list = raw ? JSON.parse(raw) : []
      const entry = { orderNumber: result.orderNumber, phone: form.phone, total: result.total, createdAt: new Date().toISOString() }
      const next = [entry, ...list.filter((x: any) => x.orderNumber !== result.orderNumber)].slice(0, 5)
      localStorage.setItem('hg_recent_orders', JSON.stringify(next))
    } catch { /* noop */ }
    cart.clear()
    router.push(`/order/${result.orderNumber}?phone=${encodeURIComponent(form.phone)}`)
  } catch (err: any) {
    const data = err?.response?.data
    if (data?.error === 'BELOW_MINIMUM') {
      error.value = `Minimum order is RM ${Number(data.minimum).toFixed(2)}. Your subtotal is RM ${Number(data.subtotal).toFixed(2)}.`
    } else if (data?.error === 'AREA_NOT_SERVICEABLE') {
      error.value = data.message || "We don't deliver to that postcode yet."
      postcodeInvalid.value = true
    } else {
      error.value = data?.message || 'Unable to place order'
    }
    submitting.value = false
  }
}
</script>

<style scoped>
@reference "../../assets/css/main.css";
.input { @apply w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30; }
.slot { @apply flex-1 rounded-full border border-stone-200 px-4 py-2 text-sm hover:border-olive; }
.slot-active { @apply bg-olive text-white border-olive; }
</style>
