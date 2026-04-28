<template>
  <BaseModal v-model="open" title="" size="full">
    <template #default>
      <div class="space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-stone-900">Product Clearance Settings</h3>
          <p class="text-sm text-stone-500">Control which products appear in the Clearance module. ({{ visibleCount }} items)</p>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input v-model="search" placeholder="Search product..." class="w-full pl-9 pr-3 py-2 bg-stone-100 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50" />
          </div>
          <button @click="showAllVisible" class="px-3 py-2 text-sm bg-stone-100 border border-stone-300 rounded-lg hover:bg-stone-200 transition-colors">Show All Visible</button>
          <button @click="hideAllVisible" class="px-3 py-2 text-sm bg-stone-100 border border-stone-300 rounded-lg hover:bg-stone-200 transition-colors">Hide All Visible</button>
        </div>

        <div class="max-h-[60vh] overflow-y-auto border border-stone-200 rounded-lg">
          <div v-for="item in filteredItems" :key="item.id" class="flex items-center justify-between px-4 py-3 border-b border-stone-100 last:border-b-0 hover:bg-stone-50">
            <div class="flex items-center gap-3">
              <img v-if="item.imageUrl" :src="item.imageUrl" class="w-10 h-10 rounded object-cover" />
              <div v-else class="w-10 h-10 rounded bg-stone-100 flex items-center justify-center">
                <ImageIcon class="w-4 h-4 text-stone-400" />
              </div>
              <div>
                <div class="text-sm font-medium text-stone-900">{{ item.description }}</div>
                <div class="text-xs text-stone-500">{{ item.itemCode }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium text-stone-500">SHOW</span>
              <button @click="item.showInClearance = !item.showInClearance" :class="['relative w-11 h-6 rounded-full transition-colors', item.showInClearance ? 'bg-[rgb(134,153,64)]' : 'bg-stone-300']">
                <span :class="['absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', item.showInClearance ? 'translate-x-5' : '']" />
              </button>
            </div>
          </div>
          <div v-if="!filteredItems.length" class="text-center py-8 text-stone-400 text-sm">No products found.</div>
        </div>
      </div>
    </template>
    <template #footer>
      <BaseButton variant="secondary" @click="close">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="saving" @click="save">Save Changes</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseModal from '../base/BaseModal.vue'
import BaseButton from '../base/BaseButton.vue'
import { Search, ImageIcon } from 'lucide-vue-next'
import type { ClearanceSettingItem } from '../../types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; saved: [] }>()

const toast = useToast()
const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

const items = ref<ClearanceSettingItem[]>([])
const original = ref<Map<string, boolean>>(new Map())
const search = ref('')
const saving = ref(false)

const filteredItems = computed(() => {
  if (!search.value) return items.value
  const q = search.value.toLowerCase()
  return items.value.filter(i => i.description.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q))
})

const visibleCount = computed(() => items.value.filter(i => i.showInClearance).length)

function showAllVisible() {
  filteredItems.value.forEach(i => i.showInClearance = true)
}

function hideAllVisible() {
  filteredItems.value.forEach(i => i.showInClearance = false)
}

function close() {
  emit('update:modelValue', false)
}

async function save() {
  const changed = items.value.filter(i => i.showInClearance !== original.value.get(i.id))
  if (!changed.length) { close(); return }

  saving.value = true
  try {
    await api.put('/product-clearance/settings', {
      items: changed.map(i => ({ stockItemId: i.id, showInClearance: i.showInClearance })),
    })
    toast.success(`${changed.length} product(s) updated`)
    emit('saved')
    close()
  } catch { toast.error('Failed to save settings') }
  finally { saving.value = false }
}

watch(() => props.modelValue, async (v) => {
  if (!v) return
  try {
    const { data } = await api.get('/product-clearance/settings')
    items.value = data.data
    original.value = new Map(data.data.map((i: ClearanceSettingItem) => [i.id, i.showInClearance]))
  } catch { toast.error('Failed to load settings') }
})
</script>
