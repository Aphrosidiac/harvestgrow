<template>
  <div class="bg-white border border-stone-200 rounded-xl p-6">
    <div v-if="title" class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">{{ title }}</h3>
      <slot name="header-action" />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
</script>
