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
          <div class="mt-6 flex flex-wrap gap-3">
            <RouterLink
              to="/shop"
              class="bg-olive text-white rounded-full px-6 py-3 font-medium hover:bg-[var(--color-olive-dark)] transition-colors"
            >Shop now</RouterLink>
            <RouterLink
              to="/quick-order"
              class="bg-white border border-olive text-olive rounded-full px-6 py-3 font-medium hover:bg-olive hover:text-white transition-colors"
            >Quick Order</RouterLink>
            <RouterLink
              to="/track"
              class="border border-stone-300 text-stone-700 rounded-full px-6 py-3 font-medium hover:border-olive hover:text-olive transition-colors"
            >Track order</RouterLink>
          </div>
        </div>
        <div class="aspect-square rounded-3xl overflow-hidden shadow-sm bg-white">
          <img
            src="/images/facility/cta-01.png"
            alt="HarvestGrow facility"
            class="w-full h-full object-cover"
            @error="onHeroErr"
          />
        </div>
      </div>
    </section>

    <!-- Trusted by strip -->
    <section class="bg-white border-y border-stone-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p class="text-center text-xs uppercase tracking-wider text-stone-500 mb-5">
          Trusted by restaurants &amp; hotels across Johor
        </p>
        <div class="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
          <img
            v-for="i in 9"
            :key="i"
            :src="`/images/clients/client-0${i}.png`"
            :alt="`Client ${i}`"
            class="h-10 md:h-12 object-contain client-logo"
          />
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
import { useShopStore } from '../../stores/shop'
import ProductCard from '../../components/shop/ProductCard.vue'

const shop = useShopStore()

onMounted(async () => {
  await Promise.all([shop.fetchCategories(), shop.fetchProducts()])
})

const featured = computed(() => shop.products.slice(0, 8))

function onHeroErr(e: Event) {
  (e.target as HTMLImageElement).style.display = 'none'
}
</script>

<style scoped>
.client-logo {
  filter: grayscale(1) opacity(0.7);
  transition: filter 0.2s ease;
}
.client-logo:hover {
  filter: none;
}
</style>
