<template>
  <!-- Floating trigger button -->
  <button
    v-if="!assistant.isOpen"
    @click="assistant.toggle"
    class="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/30 flex items-center justify-center text-stone-50 transition-all hover:scale-105 z-40"
    title="Ask DG Assistant"
  >
    <Sparkles class="w-6 h-6" />
  </button>

  <!-- Chat drawer -->
  <div
    v-if="assistant.isOpen"
    class="fixed bottom-6 right-6 w-[380px] h-[560px] max-h-[85vh] bg-white border border-stone-300 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center">
          <Sparkles class="w-4 h-4 text-green-600" />
        </div>
        <div>
          <div class="text-sm font-medium text-stone-900">DG Assistant</div>
          <div class="text-xs text-stone-500">Ask about your data</div>
        </div>
      </div>
      <div class="flex gap-1">
        <button @click="assistant.clear" title="Clear" class="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-200">
          <RotateCcw class="w-4 h-4" />
        </button>
        <button @click="assistant.close" title="Close" class="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-200">
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div ref="scrollEl" class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      <div v-if="assistant.messages.length === 0" class="text-center text-sm text-stone-500 mt-8">
        <Sparkles class="w-8 h-8 mx-auto mb-3 text-green-600/60" />
        <div class="font-medium text-stone-700 mb-1">Hi! I can help you check your data.</div>
        <div class="text-xs mb-4">Try asking:</div>
        <div class="space-y-1.5 text-left max-w-[260px] mx-auto">
          <button
            v-for="s in suggestions"
            :key="s"
            @click="quickSend(s)"
            class="w-full text-left px-3 py-2 bg-stone-200/50 hover:bg-stone-200 border border-stone-300 rounded-lg text-xs text-stone-600 hover:text-stone-900 transition-colors"
          >{{ s }}</button>
        </div>
      </div>

      <div
        v-for="(m, i) in assistant.messages"
        :key="i"
        :class="m.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <div
          :class="[
            'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words',
            m.role === 'user'
              ? 'bg-green-600 text-stone-50 rounded-br-sm'
              : 'bg-stone-200 text-stone-900 rounded-bl-sm',
          ]"
          v-html="m.role === 'assistant' ? renderMarkdown(m.content) : escapeHtml(m.content)"
        />
      </div>

      <div v-if="assistant.isLoading" class="flex justify-start">
        <div class="bg-stone-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-stone-500 flex items-center gap-2">
          <span class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
          <span class="w-2 h-2 bg-green-600 rounded-full animate-pulse" style="animation-delay: 150ms"></span>
          <span class="w-2 h-2 bg-green-600 rounded-full animate-pulse" style="animation-delay: 300ms"></span>
        </div>
      </div>

      <div v-if="assistant.error" class="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
        {{ assistant.error }}
      </div>
    </div>

    <!-- Input -->
    <form @submit.prevent="handleSend" class="p-3 border-t border-stone-200 bg-white flex gap-2">
      <input
        v-model="input"
        type="text"
        placeholder="Ask about invoices, stock, debtors..."
        :disabled="assistant.isLoading"
        class="flex-1 bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-500 focus:outline-none focus:border-green-600/50 disabled:opacity-50"
      />
      <button
        type="submit"
        :disabled="!input.trim() || assistant.isLoading"
        class="px-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-50 rounded-lg transition-colors flex items-center justify-center"
      >
        <Send class="w-4 h-4" />
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Sparkles, X, Send, RotateCcw } from 'lucide-vue-next'
import { useAssistantStore } from '../stores/assistant'

const assistant = useAssistantStore()
const input = ref('')
const scrollEl = ref<HTMLElement | null>(null)

const suggestions = [
  'How many invoices created today?',
  'Show me outstanding invoices',
  'What items are low on stock?',
  'Today\'s revenue so far',
  'Who owes us the most money?',
]

async function handleSend() {
  const text = input.value
  input.value = ''
  await assistant.send(text)
}

async function quickSend(text: string) {
  input.value = ''
  await assistant.send(text)
}

watch(() => assistant.messages.length, async () => {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
})
watch(() => assistant.isLoading, async () => {
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
})

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function renderMarkdown(s: string): string {
  let html = escapeHtml(s)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/`([^`]+)`/g, '<code class="bg-white px-1 py-0.5 rounded text-green-500 text-xs">$1</code>')
  html = html.replace(/^\| (.+) \|$/gm, (_, cells) => {
    const parts = cells.split(' | ').map((c: string) => `<td class="px-2 py-1 border border-stone-300">${c}</td>`).join('')
    return `<tr>${parts}</tr>`
  })
  html = html.replace(/(<tr>.*<\/tr>)/s, '<table class="my-2 text-xs border-collapse">$1</table>')
  html = html.replace(/\n/g, '<br>')
  return html
}
</script>
