import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface CartLine {
  stockItemId: string
  itemName: string
  imageUrl?: string | null
  unit: string
  unitPrice: number
  quantity: number
  cutStyle?: string
  notes?: string
}

const STORAGE_KEY = 'hg_cart'

function loadInitial(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>(loadInitial())

  watch(
    lines,
    (val) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch { /* noop */ }
    },
    { deep: true }
  )

  const subtotal = computed(() =>
    Number(lines.value.reduce((s, l) => s + l.unitPrice * l.quantity, 0).toFixed(2))
  )
  const lineCount = computed(() =>
    lines.value.reduce((s, l) => s + l.quantity, 0)
  )
  const distinctCount = computed(() => lines.value.length)

  function keyOf(l: { stockItemId: string; cutStyle?: string }) {
    return `${l.stockItemId}|${l.cutStyle || ''}`
  }

  function addLine(line: CartLine) {
    const k = keyOf(line)
    const existing = lines.value.find((l) => keyOf(l) === k)
    if (existing) {
      existing.quantity = Number((existing.quantity + line.quantity).toFixed(3))
    } else {
      lines.value.push({ ...line })
    }
  }

  function updateQty(index: number, quantity: number) {
    if (index < 0 || index >= lines.value.length) return
    if (quantity <= 0) { lines.value.splice(index, 1); return }
    lines.value[index].quantity = quantity
  }

  function updateCutStyle(index: number, cutStyle: string | undefined) {
    if (index < 0 || index >= lines.value.length) return
    lines.value[index].cutStyle = cutStyle
  }

  function removeLine(index: number) {
    if (index < 0 || index >= lines.value.length) return
    lines.value.splice(index, 1)
  }

  function clear() { lines.value = [] }

  return { lines, subtotal, lineCount, distinctCount, addLine, updateQty, updateCutStyle, removeLine, clear }
})
