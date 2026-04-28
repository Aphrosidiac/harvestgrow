<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-lg font-semibold text-stone-900">Pricing List New</h2>
      <BaseButton variant="secondary" size="sm" disabled><Clock class="w-4 h-4 mr-1" /> Audit Trail</BaseButton>
    </div>

    <div class="overflow-x-auto bg-white border border-stone-200 rounded-xl">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-stone-500 uppercase bg-stone-200/50 border-b border-stone-200">
          <tr>
            <th class="px-4 py-3 font-medium w-16">No.</th>
            <th class="px-4 py-3 font-medium">Date</th>
            <th class="px-4 py-3 font-medium">Items</th>
            <th class="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200">
          <tr v-if="loading"><td colspan="4" class="px-4 py-12 text-center text-stone-500">Loading...</td></tr>
          <tr v-else-if="!snapshots.length"><td colspan="4" class="px-4 py-12 text-center text-stone-500">No pricing history found.</td></tr>
          <tr v-else v-for="(s, idx) in snapshots" :key="idx" class="hover:bg-stone-200/30 transition-colors">
            <td class="px-4 py-3 text-stone-500">{{ (page - 1) * limit + idx + 1 }}</td>
            <td class="px-4 py-3 text-stone-900 font-medium">{{ formatDate(s.date) }}</td>
            <td class="px-4 py-3 text-stone-700">{{ s.items.toLocaleString() }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="$router.push('/app/pricing/matrix')" class="p-1.5 text-stone-500 hover:text-blue-400 transition-colors" title="Edit">
                <Pencil class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mt-4">
      <div class="flex items-center gap-1">
        <button v-for="s in [10,25,50,100]" :key="s" @click="limit = s; page = 1" :class="['px-3 py-1.5 text-sm rounded-lg transition-colors', limit === s ? 'bg-green-600 text-stone-50 font-medium' : 'text-stone-600 hover:bg-stone-200']">{{ s }}</button>
      </div>
      <BasePagination :page="page" :total="total" :limit="limit" @update:page="page = $event" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import api from '../../lib/api'
import BaseButton from '../../components/base/BaseButton.vue'
import BasePagination from '../../components/base/BasePagination.vue'
import { Pencil, Clock } from 'lucide-vue-next'

const snapshots = ref<{ date: string; items: number }[]>([])
const loading = ref(true)
const page = ref(1)
const limit = ref(10)
const total = ref(0)

function formatDate(d: string): string {
  const date = new Date(d)
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

async function fetchSnapshots() {
  loading.value = true
  try {
    const { data } = await api.get('/pricing-boards/daily', { params: { page: page.value, limit: limit.value } })
    snapshots.value = data.data
    total.value = data.total
  } catch {} finally { loading.value = false }
}

watch([page, limit], () => fetchSnapshots())
onMounted(() => fetchSnapshots())
</script>
