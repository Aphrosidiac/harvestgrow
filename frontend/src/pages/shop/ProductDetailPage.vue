<template>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="py-20 text-center text-stone-500">Loading...</div>
    <div v-else-if="!product" class="py-20 text-center text-stone-500">Product not found.</div>
    <div v-else class="grid md:grid-cols-2 gap-8">
      <div class="aspect-square bg-cream rounded-3xl overflow-hidden flex items-center justify-center">
        <img
          v-if="product.imageUrl && !imgFailed"
          :src="product.imageUrl"
          :alt="product.name"
          class="w-full h-full object-cover"
          @error="imgFailed = true"
        />
        <Leaf v-else class="w-32 h-32 text-olive/40" />
      </div>
      <div class="flex flex-col gap-4">
        <h1 class="text-3xl font-semibold text-stone-800">{{ product.name }}</h1>
        <div class="flex items-baseline gap-3">
          <span class="text-3xl font-bold text-olive">RM {{ product.sellPrice.toFixed(2) }}</span>
          <span v-if="product.previousPrice && product.previousPrice > product.sellPrice" class="text-sm text-stone-400 line-through">
            RM {{ product.previousPrice.toFixed(2) }}
          </span>
          <span class="text-sm text-stone-500">/ {{ product.unit }}</span>
        </div>
        <p v-if="product.description" class="text-stone-600">{{ product.description }}</p>
        <div v-if="product.shelfLifeDays" class="text-xs text-stone-500">
          Shelf life: approx {{ product.shelfLifeDays }} days
        </div>

        <div v-if="product.cutOptions.length" class="mt-2">
          <div class="text-sm font-medium mb-1">Cut style</div>
          <CutStylePicker v-model="cutStyle" :options="product.cutOptions" />
        </div>

        <div class="mt-2">
          <div class="text-sm font-medium mb-1">Quantity ({{ product.unit }})</div>
          <QtyStepper v-model="qty" :min="0.1" :step="0.5" />
        </div>

        <div class="mt-2">
          <div class="text-sm font-medium mb-1">Notes (optional)</div>
          <textarea
            v-model="notes"
            rows="2"
            class="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30"
            placeholder="e.g. cut thin, include roots, etc."
          />
        </div>

        <button
          class="mt-4 bg-olive text-white rounded-full py-3 font-medium hover:bg-olive-dark transition-colors"
          :disabled="!product.inStock"
          @click="add"
        >{{ product.inStock ? 'Add to cart' : 'Out of stock' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Leaf } from 'lucide-vue-next'
import { useShopStore } from '../../stores/shop'
import { useCartStore } from '../../stores/cart'
import QtyStepper from '../../components/shop/QtyStepper.vue'
import CutStylePicker from '../../components/shop/CutStylePicker.vue'

const route = useRoute()
const router = useRouter()
const shop = useShopStore()
const cart = useCartStore()

const loading = ref(true)
const qty = ref(1)
const cutStyle = ref<string | undefined>()
const notes = ref('')
const imgFailed = ref(false)

const product = computed(() => shop.currentProduct)

onMounted(async () => {
  loading.value = true
  try {
    await shop.fetchProduct(route.params.id as string)
    cutStyle.value = product.value?.cutOptions?.[0]
  } finally { loading.value = false }
})

function add() {
  if (!product.value) return
  cart.addLine({
    stockItemId: product.value.id,
    itemName: product.value.name,
    imageUrl: product.value.imageUrl,
    unit: product.value.unit,
    unitPrice: product.value.sellPrice,
    quantity: qty.value,
    cutStyle: cutStyle.value,
    notes: notes.value || undefined,
  })
  router.push('/cart')
}
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.bg-olive-dark { background-color: #5a6834; }
.text-olive { color: #6b7a3d; }
.bg-cream { background-color: #f5ebe2; }
.hover\:bg-olive-dark:hover { background-color: #5a6834; }
</style>
