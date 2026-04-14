<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[100] space-y-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm max-w-sm', typeClasses[toast.type]]"
        >
          <span class="flex-1">{{ toast.message }}</span>
          <button @click="removeToast(toast.id)" class="opacity-60 hover:opacity-100">
            <X class="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useToastStore } from '../../composables/useToast'

const { toasts, removeToast } = useToastStore()

const typeClasses: Record<string, string> = {
  success: 'bg-green-900/80 border-green-700 text-green-200',
  error: 'bg-red-900/80 border-red-700 text-red-200',
  info: 'bg-stone-200 border-stone-300 text-stone-700',
}
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { transform: translateX(100%); opacity: 0; }
.toast-leave-to { transform: translateX(100%); opacity: 0; }
</style>
