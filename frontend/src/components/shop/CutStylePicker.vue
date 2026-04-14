<template>
  <div class="flex flex-wrap gap-1">
    <button
      v-for="opt in options"
      :key="opt"
      type="button"
      class="text-[11px] px-2 py-1 rounded-full border transition-colors"
      :class="modelValue === opt
        ? 'bg-olive text-white border-olive'
        : 'bg-white text-stone-600 border-stone-200 hover:border-olive'"
      @click="emit('update:modelValue', opt)"
    >{{ opt }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue?: string; options: string[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<style scoped>
.bg-olive { background-color: #6b7a3d; }
.border-olive { border-color: #6b7a3d; }
.text-olive { color: #6b7a3d; }
.hover\:border-olive:hover { border-color: #6b7a3d; }
</style>
