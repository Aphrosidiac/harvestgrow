<template>
  <div class="w-full">
    <div class="border-2 border-dashed border-stone-300 rounded-lg bg-white">
      <canvas
        ref="canvasRef"
        class="w-full touch-none block rounded-lg"
        :height="height"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointerleave="onUp"
      />
    </div>
    <div class="flex items-center gap-2 mt-2">
      <button type="button" @click="() => clear()" class="text-xs text-stone-600 underline">Clear</button>
      <span v-if="hasInk" class="text-xs text-green-700">Signature captured</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = defineProps<{ modelValue?: string; height?: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const drawing = ref(false)
const hasInk = ref(false)
const height = props.height ?? 180

function ctx() {
  const c = canvasRef.value
  if (!c) return null
  return c.getContext('2d')
}

function resize() {
  const c = canvasRef.value
  if (!c) return
  const rect = c.getBoundingClientRect()
  c.width = rect.width
  c.height = height
  const g = ctx()
  if (g) {
    g.strokeStyle = '#1f2937'
    g.lineWidth = 2
    g.lineCap = 'round'
    g.lineJoin = 'round'
  }
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
})

watch(() => props.modelValue, (v) => {
  if (!v) {
    clear(false)
  }
})

function onDown(e: PointerEvent) {
  const g = ctx()
  if (!g) return
  drawing.value = true
  const r = canvasRef.value!.getBoundingClientRect()
  g.beginPath()
  g.moveTo(e.clientX - r.left, e.clientY - r.top)
}

function onMove(e: PointerEvent) {
  if (!drawing.value) return
  const g = ctx()
  if (!g) return
  const r = canvasRef.value!.getBoundingClientRect()
  g.lineTo(e.clientX - r.left, e.clientY - r.top)
  g.stroke()
  hasInk.value = true
}

function onUp() {
  if (!drawing.value) return
  drawing.value = false
  const c = canvasRef.value
  if (c && hasInk.value) {
    emit('update:modelValue', c.toDataURL('image/png'))
  }
}

function clear(notify = true) {
  const c = canvasRef.value
  const g = ctx()
  if (c && g) {
    g.clearRect(0, 0, c.width, c.height)
    hasInk.value = false
    if (notify) emit('update:modelValue', '')
  }
}

defineExpose({ clear })
</script>
