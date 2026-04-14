<template>
  <div>
    <label v-if="label" :for="id" class="block text-sm font-medium text-stone-700 mb-1.5">
      {{ label }} <span v-if="required" class="text-red-400">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :step="step"
      :min="min"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2.5 text-stone-900 text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-green-600/50 focus:border-green-600 disabled:opacity-50"
    />
    <p v-if="error" class="mt-1 text-xs text-red-400">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue?: string | number
  label?: string
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  id?: string
  step?: string
  min?: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
