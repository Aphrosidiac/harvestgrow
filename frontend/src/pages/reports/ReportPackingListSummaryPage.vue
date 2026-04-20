<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Packing List Summary</h2>
    </div>

    <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
      <h3 class="text-sm font-semibold text-stone-800 mb-4">Generate Packing Summary</h3>
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-xs text-stone-500 mb-1">Template</label>
          <select
            v-model="template"
            class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50"
          >
            <option value="" disabled>Select packing list template...</option>
            <option value="default">Default Template</option>
            <option value="detailed">Detailed Template</option>
            <option value="summary">Summary Template</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-stone-500 mb-1">Date</label>
          <input
            v-model="date"
            type="date"
            class="bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500"
          />
        </div>
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :disabled="!template"
          :class="{ 'opacity-50 cursor-not-allowed': !template }"
        >
          Generate Report
        </button>
      </div>
    </div>

    <div class="bg-white border border-stone-200 rounded-xl p-12 text-center">
      <FileText class="w-12 h-12 text-stone-300 mx-auto mb-3" />
      <p class="text-stone-500 text-sm">
        Select a packing list template and date, then click 'Generate Report'.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FileText } from 'lucide-vue-next'

const today = () => new Date().toISOString().split('T')[0]
const template = ref('')
const date = ref(today())
</script>
