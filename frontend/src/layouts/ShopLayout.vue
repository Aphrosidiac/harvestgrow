<template>
  <div class="min-h-screen flex flex-col bg-stone-50 text-stone-800">
    <!-- Top nav -->
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <RouterLink to="/" class="flex items-center gap-2 shrink-0">
          <span class="inline-flex w-9 h-9 rounded-full bg-olive items-center justify-center text-white font-bold">HG</span>
          <span class="font-semibold text-olive hidden sm:inline">HarvestGrow</span>
        </RouterLink>

        <nav class="hidden md:flex items-center gap-5 text-sm text-stone-600">
          <RouterLink to="/shop" class="hover:text-olive">Shop</RouterLink>
          <RouterLink to="/track" class="hover:text-olive">Track Order</RouterLink>
        </nav>

        <div class="flex-1">
          <form @submit.prevent="onSearch" class="max-w-md ml-auto hidden sm:block">
            <input
              v-model="search"
              type="search"
              placeholder="Search fresh produce..."
              class="w-full rounded-full border border-stone-200 bg-cream px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30"
            />
          </form>
        </div>

        <RouterLink to="/cart" class="relative text-stone-600 hover:text-olive">
          <ShoppingCart class="w-6 h-6" />
          <span
            v-if="cart.distinctCount > 0"
            class="absolute -top-1 -right-2 bg-olive text-white text-[10px] font-semibold rounded-full min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center"
          >{{ cart.distinctCount }}</span>
        </RouterLink>

        <RouterLink
          v-if="!shop.shopToken"
          to="/account/login"
          class="text-sm text-stone-600 hover:text-olive"
        >Login</RouterLink>
        <RouterLink
          v-else
          to="/account"
          class="text-sm text-stone-600 hover:text-olive"
        >Account</RouterLink>
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="bg-olive text-cream mt-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <h3 class="font-semibold text-lg mb-2">HarvestGrow Veg Sdn Bhd</h3>
          <p class="text-sm opacity-90">500+ varieties of fresh vegetables &amp; dried goods, delivered same-day.</p>
        </div>
        <div>
          <h4 class="font-semibold mb-2">HQ — Johor Bahru</h4>
          <p class="text-sm opacity-90">{{ settings['shop.company.address'] || '5 Jalan Kempas Lama, 2/4 Kempas Lama, 81200 JB, Johor, Malaysia' }}</p>
          <p class="text-sm opacity-90 mt-1">{{ settings['shop.contact.phone'] || settings['shop.company.phone'] || '+607-511 2696' }}</p>
        </div>
        <div>
          <h4 class="font-semibold mb-2">Get In Touch</h4>
          <p class="text-sm opacity-90">{{ settings['shop.contact.email'] || 'sales@harvestgrow-veg.com' }}</p>
          <a
            :href="whatsappLink"
            target="_blank"
            rel="noopener"
            class="text-sm underline hover:text-white"
          >WhatsApp us</a>
        </div>
      </div>
      <div class="border-t border-white/10 py-4 text-center text-xs opacity-70">
        &copy; {{ new Date().getFullYear() }} HarvestGrow Veg Sdn Bhd
      </div>
    </footer>

    <!-- Floating WhatsApp -->
    <a
      :href="whatsappLink"
      target="_blank"
      rel="noopener"
      aria-label="WhatsApp us"
      class="fixed bottom-5 right-5 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center transition-colors"
    >
      <MessageCircle class="w-7 h-7" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ShoppingCart, MessageCircle } from 'lucide-vue-next'
import { useCartStore } from '../stores/cart'
import { useShopStore } from '../stores/shop'
import shopApi from '../lib/shop-api'

const cart = useCartStore()
const shop = useShopStore()
const router = useRouter()
const search = ref('')
const settings = ref<Record<string, string>>({})

const FALLBACK_WHATSAPP = 'https://wa.me/60137779069?text=Hi%20HarvestGrow,%20I%20want%20to%20order...'
const whatsappLink = computed(() => settings.value['shop.whatsapp.link'] || FALLBACK_WHATSAPP)

function onSearch() {
  router.push({ path: '/shop', query: search.value ? { search: search.value } : {} })
}

onMounted(async () => {
  try {
    const { data } = await shopApi.get('/settings')
    settings.value = data.data || {}
  } catch { /* noop */ }
})
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
.bg-cream { background-color: #f5ebe2; }
.text-cream { color: #f5ebe2; }
</style>
