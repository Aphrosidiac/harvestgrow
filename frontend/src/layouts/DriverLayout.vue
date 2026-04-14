<template>
  <div class="min-h-screen bg-amber-50/40 flex flex-col">
    <header class="h-14 bg-white border-b border-stone-200 flex items-center px-4 gap-3 sticky top-0 z-40">
      <RouterLink to="/driver" class="flex items-center gap-2">
        <img src="/logo-sidebar.png" alt="HarvestGrow" class="h-8" />
      </RouterLink>
      <div class="ml-auto flex items-center gap-3">
        <div class="text-right min-w-0">
          <div class="text-sm font-semibold text-stone-900 truncate">{{ auth.user?.name }}</div>
          <div class="text-[11px] text-stone-500">Driver</div>
        </div>
        <button @click="logout" class="text-stone-500 hover:text-red-500 p-2" aria-label="Log out">
          <LogOut class="w-5 h-5" />
        </button>
      </div>
    </header>
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/admin/login')
}
</script>
