<template>
  <div class="flex items-center justify-center h-64">
    <div class="text-center">
      <Construction class="w-12 h-12 text-stone-400 mx-auto mb-3" />
      <h2 class="text-lg font-semibold text-stone-700">{{ title }}</h2>
      <p class="text-sm text-stone-500 mt-1">This module is under development.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Construction } from 'lucide-vue-next'

const route = useRoute()
const title = computed(() => (route.meta.pageTitle as string) || 'Coming Soon')
</script>
