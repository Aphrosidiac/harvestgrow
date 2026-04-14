<template>
  <div class="inline-flex items-center border border-stone-200 rounded-full overflow-hidden">
    <button type="button" class="w-8 h-8 text-stone-600 hover:bg-stone-100" @click="dec">−</button>
    <input
      type="number"
      :value="modelValue"
      :min="min"
      :step="step"
      class="w-10 text-center text-sm bg-transparent focus:outline-none"
      @input="onInput"
    />
    <button type="button" class="w-8 h-8 text-stone-600 hover:bg-stone-100" @click="inc">+</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: number; min?: number; step?: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>()

function dec() { emit('update:modelValue', Math.max(props.min ?? 0, +(props.modelValue - (props.step ?? 1)).toFixed(3))) }
function inc() { emit('update:modelValue', +(props.modelValue + (props.step ?? 1)).toFixed(3)) }
function onInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value)
  if (!isNaN(v)) emit('update:modelValue', Math.max(props.min ?? 0, v))
}
</script>
