<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-semibold text-olive">My account</h1>
      <button class="text-sm text-stone-500 hover:text-red-500" @click="onLogout">Logout</button>
    </div>
    <div v-if="loading" class="text-stone-500">Loading...</div>
    <div v-else-if="shop.customer" class="space-y-6">
      <div class="bg-white rounded-2xl border border-stone-200 p-5">
        <div class="font-semibold">{{ shop.customer.name }}</div>
        <div class="text-sm text-stone-500">{{ shop.customer.phone }}</div>
        <div v-if="shop.customer.email" class="text-sm text-stone-500">{{ shop.customer.email }}</div>
      </div>
      <div>
        <h2 class="font-semibold mb-3">Recent orders</h2>
        <div v-if="!shop.customer.orders || shop.customer.orders.length === 0" class="text-stone-500 text-sm">No orders yet.</div>
        <div v-else class="space-y-2">
          <RouterLink
            v-for="o in shop.customer.orders"
            :key="o.id"
            :to="`/track?orderNumber=${o.orderNumber}&phone=${shop.customer!.phone}`"
            class="block bg-white rounded-xl border border-stone-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div class="flex justify-between">
              <div>
                <div class="font-mono font-semibold">{{ o.orderNumber }}</div>
                <div class="text-xs text-stone-500">{{ formatDate(o.createdAt) }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-semibold">RM {{ Number(o.total).toFixed(2) }}</div>
                <div class="text-xs text-olive">{{ o.status }}</div>
              </div>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useShopStore } from '../../stores/shop'

const shop = useShopStore()
const router = useRouter()
const loading = ref(true)

onMounted(async () => {
  if (!shop.shopToken) { router.push('/account/login'); return }
  try { await shop.fetchMe() } finally { loading.value = false }
})

function onLogout() { shop.logout(); router.push('/') }
function formatDate(d: string) { try { return new Date(d).toLocaleString() } catch { return d } }
</script>

<style scoped>
.text-olive { color: #6b7a3d; }
</style>
