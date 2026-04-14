<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
    <p class="text-sm text-stone-500">
      Showing {{ (page - 1) * limit + 1 }} to {{ Math.min(page * limit, total) }} of {{ total }}
    </p>
    <div class="flex items-center gap-1">
      <button
        :disabled="page <= 1"
        @click="$emit('update:page', page - 1)"
        class="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Prev
      </button>
      <button
        v-for="p in visiblePages"
        :key="p"
        @click="$emit('update:page', p)"
        :class="[
          'px-3 py-1.5 text-sm rounded-lg transition-colors',
          p === page ? 'bg-green-600 text-stone-50 font-medium' : 'text-stone-600 hover:bg-stone-200',
        ]"
      >
        {{ p }}
      </button>
      <button
        :disabled="page >= totalPages"
        @click="$emit('update:page', page + 1)"
        class="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  total: number
  limit: number
}>()

defineEmits<{ 'update:page': [page: number] }>()

const totalPages = computed(() => Math.ceil(props.total / props.limit))

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.page - 2)
  const end = Math.min(totalPages.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})
</script>
