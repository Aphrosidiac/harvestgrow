import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

export const useAssistantStore = defineStore('assistant', () => {
  const messages = ref<AssistantMessage[]>([])
  const isOpen = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function toggle() { isOpen.value = !isOpen.value }
  function close() { isOpen.value = false }
  function clear() { messages.value = []; error.value = null }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading.value) return
    error.value = null
    messages.value.push({ role: 'user', content: trimmed, ts: Date.now() })
    isLoading.value = true
    try {
      const payload = messages.value.map(m => ({ role: m.role, content: m.content }))
      const { data } = await api.post('/assistant/chat', { messages: payload })
      messages.value.push({ role: 'assistant', content: data.data.reply, ts: Date.now() })
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? e?.message ?? 'Request failed'
    } finally {
      isLoading.value = false
    }
  }

  return { messages, isOpen, isLoading, error, toggle, close, clear, send }
})
