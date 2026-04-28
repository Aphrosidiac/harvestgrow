<template>
  <BaseModal v-model="open" title="Batch Copy Prices" size="md">
    <div class="space-y-5">
      <div class="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Source Group</label>
          <select v-model="sourceId" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select Source</option>
            <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div class="text-stone-400 text-lg pb-2">→</div>
        <div>
          <label class="block text-sm font-medium text-stone-700 mb-1">Target Group</label>
          <select v-model="targetId" class="w-full bg-stone-100 border border-stone-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Select Target</option>
            <option v-for="b in boards" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
      </div>

      <div>
        <h4 class="text-sm font-medium text-stone-700 mb-3">Apply to Products (UOM)</h4>
        <div class="space-y-3">
          <div v-for="uom in uomOptions" :key="uom.key" class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer w-20">
              <input type="checkbox" v-model="uom.checked" class="accent-[rgb(134,153,64)]" />
              <span class="text-sm text-stone-700">{{ uom.label }}</span>
            </label>
            <label class="text-sm text-stone-500">Adjustment:</label>
            <input v-model.number="uom.adjustment" type="number" step="0.01" class="w-24 bg-stone-100 border border-stone-300 rounded px-2 py-1 text-sm text-center" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" @click="open = false">Cancel</BaseButton>
      <BaseButton variant="primary" :loading="copying" @click="applyCopy">Apply Copy</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseModal from '../base/BaseModal.vue'
import BaseButton from '../base/BaseButton.vue'

const props = defineProps<{ modelValue: boolean; boards: { id: string; name: string }[] }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; copied: [] }>()
const open = computed({ get: () => props.modelValue, set: (v) => emit('update:modelValue', v) })

const toast = useToast()
const sourceId = ref('')
const targetId = ref('')
const copying = ref(false)

const uomOptions = reactive([
  { key: 'KG', label: 'KG', checked: true, adjustment: 0 },
  { key: 'CTN', label: 'CTN', checked: true, adjustment: 0 },
  { key: 'Others', label: 'Others', checked: false, adjustment: 0 },
])

async function applyCopy() {
  if (!sourceId.value || !targetId.value) { toast.error('Select source and target'); return }
  if (sourceId.value === targetId.value) { toast.error('Source and target must be different'); return }

  copying.value = true
  try {
    const uomFilters = uomOptions.filter(u => u.checked).map(u => u.key)
    const adjustments: Record<string, number> = {}
    uomOptions.filter(u => u.checked).forEach(u => { adjustments[u.key] = u.adjustment })

    const { data } = await api.post('/pricing-boards/batch-copy', {
      sourceBoardId: sourceId.value,
      targetBoardId: targetId.value,
      uomFilters,
      adjustments,
    })
    toast.success(data.message)
    emit('copied')
    open.value = false
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to copy')
  } finally { copying.value = false }
}

watch(() => props.modelValue, (v) => {
  if (v) { sourceId.value = ''; targetId.value = '' }
})
</script>
