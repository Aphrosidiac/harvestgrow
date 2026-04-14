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
            <div class="flex justify-between font-semibold text-base mt-2">
              <span>Total (COD)</span><span class="text-olive">RM {{ cart.subtotal.toFixed(2) }}</span>
            </div>
          </div>
          <button
            type="submit"
            :disabled="submitting"
            class="w-full mt-4 bg-green-600 text-white rounded-full py-3 font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
          >{{ submitting ? 'Placing...' : 'Place order — COD' }}</button>
          <p v-if="error" class="text-red-600 text-sm mt-2">{{ error }}</p>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useShopStore } from '../../stores/shop'
import { useCartStore } from '../../stores/cart'

const shop = useShopStore()
const cart = useCartStore()
const router = useRouter()

const form = reactive({
  name: '', phone: '', email: '',
  address: '', slot: 'AM' as 'AM' | 'PM', notes: '',
  createAccount: false, password: '',
})
const submitting = ref(false)
const error = ref<string | null>(null)

onMounted(() => { shop.fetchCutoff() })

async function submit() {
  submitting.value = true
  error.value = null
  try {
    const payload: any = {
      contact: { name: form.name, phone: form.phone, email: form.email || undefined },
      deliveryAddress: form.address,
      deliverySlot: form.slot,
      notes: form.notes || undefined,
      lines: cart.lines.map((l) => ({
        stockItemId: l.stockItemId, quantity: l.quantity, cutStyle: l.cutStyle, notes: l.notes,
      })),
    }
    if (form.createAccount && form.password.length >= 6) {
      payload.createAccount = { password: form.password }
    }
    const result = await shop.placeOrder(payload)
    cart.clear()
    router.push(`/order/${result.orderNumber}`)
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Unable to place order'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
@reference "../../assets/css/main.css";
.input { @apply w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30; }
.slot { @apply flex-1 rounded-full border border-stone-200 px-4 py-2 text-sm hover:border-olive; }
.slot-active { @apply bg-olive text-white border-olive; }
.bg-olive { background-color: #6b7a3d; }
.border-olive { border-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
.hover\:border-olive:hover { border-color: #6b7a3d; }
</style>
