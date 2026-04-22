<template>
  <div class="min-h-screen bg-[#f5ebe2] flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <img src="/logo-login.png" alt="HarvestGrow" class="h-24 mx-auto mb-3" />
        <h1 class="text-2xl font-bold text-[#495c14]">HarvestGrow</h1>
        <p class="text-stone-600 text-sm mt-1">Fresh Vegetable Supplier — Staff Login</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-sm">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full bg-white border border-stone-300 rounded-lg px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full bg-white border border-stone-300 rounded-lg px-3 py-2.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600"
            placeholder="Enter your password"
          />
        </div>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-[#869940] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#495c14] transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    if (auth.user?.role === 'DRIVER') {
      router.push('/driver')
    } else {
      router.push('/app/dashboard')
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Invalid credentials'
  } finally {
    loading.value = false
  }
}
</script>
