<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 class="text-2xl font-semibold text-olive mb-6">Your cart</h1>
    <div v-if="cart.lines.length === 0" class="py-16 text-center">
      <p class="text-stone-500 mb-4">Your cart is empty.</p>
      <RouterLink to="/shop" class="bg-olive text-white px-6 py-2.5 rounded-full">Browse produce</RouterLink>
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
              <span v-if="line.cutStyle" class="ml-1 text-olive">· {{ line.cutStyle }}</span>
            </div>
            <div v-if="line.notes" class="text-xs text-stone-400 mt-1">{{ line.notes }}</div>
          </div>
          <QtyStepper
            :model-value="line.quantity"
            :min="0"
            :step="0.5"
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
          <div class="flex justify-between text-base font-semibold border-t border-stone-200 pt-2 mt-2">
            <span>Total</span>
            <span class="text-olive">RM {{ cart.subtotal.toFixed(2) }}</span>
          </div>
          <RouterLink
            to="/checkout"
            class="block text-center bg-olive text-white rounded-full py-3 font-medium mt-4 hover:bg-olive-dark transition-colors"
          >Checkout</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { X } from 'lucide-vue-next'
import { useCartStore } from '../../stores/cart'
import QtyStepper from '../../components/shop/QtyStepper.vue'

const cart = useCartStore()
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.bg-olive-dark { background-color: #5a6834; }
.text-olive { color: #6b7a3d; }
.bg-cream { background-color: #f5ebe2; }
.hover\:bg-olive-dark:hover { background-color: #5a6834; }
</style>
