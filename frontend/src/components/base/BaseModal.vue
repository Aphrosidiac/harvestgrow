<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="close" />
        <div :class="['relative bg-white border border-stone-200 rounded-xl shadow-2xl w-full', sizeClasses[size || 'md']]">
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-stone-200">
            <h3 class="text-lg font-semibold text-stone-900">{{ title }}</h3>
            <button @click="close" class="text-stone-500 hover:text-stone-700 transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>
          <!-- Body -->
          <div class="px-6 py-4">
            <slot />
          </div>
          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-stone-200 flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  title: string
  size?: 'sm' | 'md' | 'lg'
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const sizeClasses: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
