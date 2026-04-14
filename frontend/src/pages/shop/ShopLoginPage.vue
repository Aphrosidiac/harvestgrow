<template>
  <div class="max-w-md mx-auto px-4 py-16">
    <h1 class="text-2xl font-semibold text-olive mb-6">Sign in</h1>
    <form @submit.prevent="submit" class="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
      <input v-model="phone" required placeholder="Phone" class="input" />
      <input v-model="password" required type="password" placeholder="Password" class="input" />
      <button type="submit" :disabled="loading" class="w-full bg-olive text-white rounded-full py-2.5 font-medium">
        {{ loading ? 'Signing in...' : 'Sign in' }}
      </button>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
      <p class="text-xs text-stone-500 text-center">
        New here? Your account is created automatically when you check out.
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShopStore } from '../../stores/shop'

const shop = useShopStore()
const router = useRouter()
const phone = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function submit() {
  loading.value = true
  error.value = null
  try {
    await shop.login(phone.value.trim(), password.value)
    router.push('/account')
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Login failed'
  } finally { loading.value = false }
}
</script>

<style scoped>
@reference "../../assets/css/main.css";
.input { @apply w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30; }
.bg-olive { background-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
</style>
