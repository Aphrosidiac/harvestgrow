<template>
  <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorClasses[color || 'gray']]">
    <slot />
  </span>
</template>

<script setup lang="ts">
defineProps<{
  color?: 'gold' | 'green' | 'red' | 'gray' | 'blue'
}>()

const colorClasses: Record<string, string> = {
  gold: 'bg-green-600/15 text-green-600',
  green: 'bg-green-500/15 text-green-400',
  red: 'bg-red-500/15 text-red-400',
  gray: 'bg-stone-300 text-stone-600',
  blue: 'bg-blue-500/15 text-blue-400',
}
</script>
