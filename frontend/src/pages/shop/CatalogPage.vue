<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-olive">{{ title }}</h1>
        <p class="text-sm text-stone-500 mt-1">{{ shop.products.length }} products</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="text-sm px-3 py-1.5 rounded-full border transition-colors"
          :class="!activeCatId ? 'bg-olive text-white border-olive' : 'bg-white text-stone-600 border-stone-200 hover:border-olive'"
          @click="filterBy(undefined)"
        >All</button>
        <button
          v-for="c in shop.categories"
          :key="c.id"
          class="text-sm px-3 py-1.5 rounded-full border transition-colors"
          :class="activeCatId === c.id ? 'bg-olive text-white border-olive' : 'bg-white text-stone-600 border-stone-200 hover:border-olive'"
          @click="filterBy(c.id)"
        >{{ c.name }}</button>
      </div>
    </div>
    <div v-if="shop.loading" class="text-center py-12 text-stone-500">Loading...</div>
    <div v-else-if="shop.products.length === 0" class="text-center py-12 text-stone-500">
      No products found.
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <ProductCard v-for="p in shop.products" :key="p.id" :product="p" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useShopStore } from '../../stores/shop'
import ProductCard from '../../components/shop/ProductCard.vue'

const shop = useShopStore()
const route = useRoute()
const router = useRouter()

const activeCatId = computed(() => (route.query.categoryId as string) || undefined)
const search = computed(() => (route.query.search as string) || undefined)

const title = computed(() => {
  if (activeCatId.value) {
    const c = shop.categories.find((x) => x.id === activeCatId.value)
    return c?.name || 'Catalog'
  }
  return search.value ? `Search: ${search.value}` : 'All products'
})

async function reload() {
  await shop.fetchProducts({ categoryId: activeCatId.value, search: search.value })
}

function filterBy(categoryId?: string) {
  router.push({ path: '/shop', query: { ...(categoryId ? { categoryId } : {}), ...(search.value ? { search: search.value } : {}) } })
}

onMounted(async () => {
  if (shop.categories.length === 0) await shop.fetchCategories()
  await reload()
})

watch(() => route.fullPath, reload)
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.border-olive { border-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
.hover\:border-olive:hover { border-color: #6b7a3d; }
</style>
