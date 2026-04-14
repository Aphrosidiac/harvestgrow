<template>
  <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
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
        <tr v-if="loading">
          <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-12 text-center text-stone-500">
            Loading...
          </td>
        </tr>
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
}>()
</script>
