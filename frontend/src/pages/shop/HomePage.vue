<template>
  <div>
    <!-- Hero -->
    <section class="bg-cream">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 class="text-4xl md:text-5xl font-bold text-olive leading-tight">
            Fresh produce from farm to your kitchen
          </h1>
          <p class="text-lg text-stone-700 mt-4">
            500+ varieties of fresh vegetables and dried goods — delivered same-day in Johor Bahru.
          </p>
          <div class="mt-6 flex gap-3">
            <RouterLink
              to="/shop"
              class="bg-olive text-white rounded-full px-6 py-3 font-medium hover:bg-olive-dark transition-colors"
            >Shop now</RouterLink>
            <RouterLink
              to="/track"
              class="border border-olive text-olive rounded-full px-6 py-3 font-medium hover:bg-olive hover:text-white transition-colors"
            >Track order</RouterLink>
          </div>
        </div>
        <div class="aspect-square rounded-3xl bg-white shadow-sm flex items-center justify-center">
          <Leaf class="w-32 h-32 text-olive/60" />
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 class="text-2xl font-semibold text-olive mb-6">Shop by category</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <RouterLink
          v-for="cat in shop.categories"
          :key="cat.id"
          :to="{ path: '/shop', query: { categoryId: cat.id } }"
          class="bg-white rounded-2xl border border-stone-200 p-6 text-center hover:shadow-md transition-shadow"
        >
          <div class="font-medium text-stone-800">{{ cat.name }}</div>
          <div class="text-xs text-stone-500 mt-1">{{ cat.productCount }} items</div>
        </RouterLink>
      </div>
    </section>

    <!-- Featured -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <h2 class="text-2xl font-semibold text-olive mb-6">Today's specials</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ProductCard v-for="p in featured" :key="p.id" :product="p" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Leaf } from 'lucide-vue-next'
import { useShopStore } from '../../stores/shop'
import ProductCard from '../../components/shop/ProductCard.vue'

const shop = useShopStore()

onMounted(async () => {
  await Promise.all([shop.fetchCategories(), shop.fetchProducts()])
})

const featured = computed(() => shop.products.slice(0, 8))
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.bg-olive-dark { background-color: #5a6834; }
.border-olive { border-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
.bg-cream { background-color: #f5ebe2; }
.hover\:bg-olive:hover { background-color: #6b7a3d; }
.hover\:bg-olive-dark:hover { background-color: #5a6834; }
</style>
