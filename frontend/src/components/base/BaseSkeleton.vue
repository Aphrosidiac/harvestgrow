<template>
  <div class="animate-pulse space-y-3">
    <template v-if="type === 'card'">
      <div v-for="i in count" :key="i" class="bg-stone-200 rounded-xl h-28" />
    </template>
    <template v-else-if="type === 'table-row'">
      <div v-for="i in count" :key="i" class="flex gap-4 items-center">
        <div class="bg-stone-200 rounded h-4 w-1/4" />
        <div class="bg-stone-200 rounded h-4 w-1/3" />
        <div class="bg-stone-200 rounded h-4 w-1/5" />
        <div class="bg-stone-200 rounded h-4 w-1/6" />
      </div>
    </template>
    <template v-else>
      <div v-for="i in count" :key="i" class="bg-stone-200 rounded h-4" :class="i % 3 === 0 ? 'w-2/3' : 'w-full'" />
    </template>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type?: 'line' | 'card' | 'table-row'
  count?: number
}>()
</script>
