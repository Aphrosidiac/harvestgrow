<template>
  <!-- Mobile card view (opt-in) -->
  <div v-if="mobileCards && !loading && data.length" class="md:hidden space-y-3">
    <div
      v-for="(row, index) in data"
      :key="`card-${index}`"
      class="bg-white border border-stone-200 rounded-xl p-4 space-y-2"
    >
      <div v-for="col in columns" :key="col.key" class="flex justify-between items-start gap-2">
        <span class="text-xs text-stone-500 uppercase shrink-0">{{ col.label }}</span>
        <span class="text-sm text-stone-700 text-right">
          <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
            {{ row[col.key] }}
          </slot>
        </span>
      </div>
      <div v-if="$slots.actions" class="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <slot name="actions" :row="row" />
      </div>
    </div>
  </div>

  <!-- Desktop table view -->
  <div :class="['overflow-x-auto bg-white border border-stone-200 rounded-xl', mobileCards && !loading && data.length ? 'hidden md:block' : '']">
    <table class="w-full text-sm text-left">
      <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 font-medium whitespace-nowrap"
            :class="col.class"
          >
            {{ col.label }}
          </th>
          <th v-if="$slots.actions" class="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-stone-200">
        <template v-if="loading">
          <tr v-for="i in 5" :key="`skel-${i}`" class="animate-pulse">
            <td v-for="col in columns" :key="col.key" class="px-4 py-3">
              <div class="bg-stone-200 rounded h-4" :class="i % 2 === 0 ? 'w-3/4' : 'w-full'" />
            </td>
            <td v-if="$slots.actions" class="px-4 py-3">
              <div class="bg-stone-200 rounded h-4 w-16 ml-auto" />
            </td>
          </tr>
        </template>
        <tr v-else-if="!data.length">
          <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-12 text-center text-stone-500">
            {{ emptyText }}
          </td>
        </tr>
        <tr v-else v-for="(row, index) in data" :key="index" class="hover:bg-stone-200/30 transition-colors">
          <td v-for="col in columns" :key="col.key" class="px-4 py-3 text-stone-700 whitespace-nowrap" :class="col.class">
            <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
          <td v-if="$slots.actions" class="px-4 py-3 text-right">
            <slot name="actions" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columns: { key: string; label: string; class?: string }[]
  data: Record<string, any>[]
  loading?: boolean
  emptyText?: string
  mobileCards?: boolean
}>()
</script>
