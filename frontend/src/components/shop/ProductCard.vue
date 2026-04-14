<template>
  <div class="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">
    <!-- Promo badge -->
    <span
      v-if="isPromo"
      class="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
    >Promo</span>
    <!-- Perishable indicator -->
    <span
      v-if="product.isPerishable"
      class="absolute top-2 right-2 z-10 bg-white/90 text-olive text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1"
      :title="product.shelfLifeDays ? `Best within ${product.shelfLifeDays} days` : 'Perishable'"
    >
      <Leaf class="w-3 h-3" />
      <span v-if="product.shelfLifeDays">{{ product.shelfLifeDays }}d</span>
    </span>
    <RouterLink :to="`/shop/product/${product.id}`" class="block aspect-square bg-cream overflow-hidden">
      <img
        v-if="product.imageUrl && !imgFailed"
        :src="product.imageUrl"
        :alt="product.name"
        class="w-full h-full object-cover"
        @error="imgFailed = true"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-olive/40">
        <Leaf class="w-16 h-16" />
      </div>
    </RouterLink>
    <div class="p-4 flex-1 flex flex-col gap-2">
      <RouterLink :to="`/shop/product/${product.id}`" class="font-medium text-stone-800 hover:text-olive line-clamp-2">
        {{ product.name }}
      </RouterLink>
      <div class="flex items-baseline gap-2">
        <span class="text-lg font-semibold text-olive">RM {{ product.sellPrice.toFixed(2) }}</span>
        <span v-if="product.previousPrice && product.previousPrice > product.sellPrice" class="text-xs text-stone-400 line-through">
          RM {{ product.previousPrice.toFixed(2) }}
        </span>
        <span class="text-xs text-stone-500 ml-auto">/ {{ product.unit }}</span>
      </div>
      <CutStylePicker
        v-if="product.cutOptions && product.cutOptions.length"
        v-model="cutStyle"
        :options="product.cutOptions"
      />
      <div class="mt-auto flex items-center gap-2">
        <QtyStepper v-model="qty" :min="1" />
        <button
          class="flex-1 bg-olive text-white rounded-full py-2 text-sm font-medium hover:bg-olive-dark transition-colors"
          @click="add"
        >Add</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Leaf } from 'lucide-vue-next'
import type { ShopProduct } from '../../types'
import { useCartStore } from '../../stores/cart'
import QtyStepper from './QtyStepper.vue'
import CutStylePicker from './CutStylePicker.vue'

const props = defineProps<{ product: ShopProduct }>()
const cart = useCartStore()

const qty = ref(1)
const cutStyle = ref<string | undefined>(props.product.cutOptions?.[0])
const imgFailed = ref(false)

const isPromo = computed(() =>
  typeof props.product.previousPrice === 'number' && props.product.previousPrice! > props.product.sellPrice,
)

function add() {
  cart.addLine({
    stockItemId: props.product.id,
    itemName: props.product.name,
    imageUrl: props.product.imageUrl,
    unit: props.product.unit,
    unitPrice: props.product.sellPrice,
    quantity: qty.value,
    cutStyle: cutStyle.value,
  })
}
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.bg-olive-dark { background-color: #5a6834; }
.text-olive { color: #6b7a3d; }
.bg-cream { background-color: #f5ebe2; }
.hover\:bg-olive-dark:hover { background-color: #5a6834; }
</style>
