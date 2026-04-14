<template>
  <div>
    <label class="block">
      <span class="sr-only">Photo</span>
      <input
        ref="inputRef"
        type="file"
        accept="image/*"
        capture="environment"
        @change="onFile"
        class="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600/10 file:text-green-700 hover:file:bg-green-600/20"
      />
    </label>
    <div v-if="preview" class="mt-2">
      <img :src="preview" class="max-h-40 rounded-lg border border-stone-200" />
      <button type="button" @click="clear" class="text-xs text-red-600 underline mt-1">Remove</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ modelValue?: string; maxWidth?: number }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const inputRef = ref<HTMLInputElement | null>(null)
const preview = ref(props.modelValue || '')
const maxW = props.maxWidth ?? 800

async function onFile(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files || !files[0]) return
  const file = files[0]
  const dataUrl = await readFile(file)
  const shrunk = await downscale(dataUrl, maxW)
  preview.value = shrunk
  emit('update:modelValue', shrunk)
}

function readFile(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(f)
  })
}

function downscale(dataUrl: string, maxWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const g = c.getContext('2d')
      if (!g) return resolve(dataUrl)
      g.drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function clear() {
  preview.value = ''
  if (inputRef.value) inputRef.value.value = ''
  emit('update:modelValue', '')
}
</script>
