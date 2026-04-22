<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-stone-900">WhatsApp AI Agents</h2>
        <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full" :class="waConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
          <span class="w-2 h-2 rounded-full" :class="waConnected ? 'bg-green-500' : 'bg-red-500'" />
          {{ waConnected ? 'WhatsApp Connected' : 'WhatsApp Disconnected' }}
        </span>
      </div>
      <RouterLink to="/app/whatsapp-settings" class="text-sm text-green-600 hover:underline">WhatsApp Settings</RouterLink>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white border border-stone-200 rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-stone-900">{{ stats.totalChats }}</p>
        <p class="text-xs text-stone-500">Total Chats</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-green-600">{{ stats.employeeChats }}</p>
        <p class="text-xs text-stone-500">Employee</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-blue-600">{{ stats.clientChats }}</p>
        <p class="text-xs text-stone-500">Client</p>
      </div>
      <div class="bg-white border border-stone-200 rounded-xl p-4 text-center">
        <p class="text-2xl font-bold text-stone-700">{{ stats.todayMessages }}</p>
        <p class="text-xs text-stone-500">Messages Today</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-stone-200 mb-6">
      <button @click="activeTab = 'EMPLOYEE'" class="flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors -mb-px" :class="activeTab === 'EMPLOYEE' ? 'border-green-600 text-green-600' : 'border-transparent text-stone-500 hover:text-stone-700'">
        Employee Agent
      </button>
      <button @click="activeTab = 'CLIENT'" class="flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors -mb-px" :class="activeTab === 'CLIENT' ? 'border-green-600 text-green-600' : 'border-transparent text-stone-500 hover:text-stone-700'">
        Client Agent
      </button>
    </div>

    <!-- Control Panel -->
    <div class="bg-white border border-stone-200 rounded-xl p-5 mb-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-semibold text-stone-900">{{ activeTab === 'EMPLOYEE' ? 'Employee' : 'Client' }} Agent</h3>
          <p class="text-xs text-stone-500 mt-0.5">{{ activeTab === 'EMPLOYEE' ? 'Auto-responds to staff members based on User phone records' : 'Auto-responds to external customers' }}</p>
        </div>
        <button @click="toggleAgent" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="isActiveAgent ? 'bg-green-600' : 'bg-stone-300'">
          <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" :class="isActiveAgent ? 'translate-x-6' : 'translate-x-1'" />
        </button>
      </div>

      <!-- Client greeting -->
      <div v-if="activeTab === 'CLIENT'" class="mt-4 pt-4 border-t border-stone-200">
        <label class="block text-xs text-stone-500 mb-1">Auto-greeting message (optional)</label>
        <textarea v-model="settings.clientGreeting" rows="2" placeholder="Welcome message for new clients..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500 resize-none" @blur="saveSettings" />
      </div>

      <!-- Blocked numbers (employee tab) -->
      <div v-if="activeTab === 'EMPLOYEE'" class="mt-4 pt-4 border-t border-stone-200">
        <label class="block text-xs text-stone-500 mb-2">Blocked Numbers (will not receive auto-replies)</label>
        <div class="flex flex-wrap gap-2 mb-2">
          <span v-for="(num, idx) in settings.blockedPhones" :key="idx" class="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-1 rounded-lg">
            {{ num }}
            <button @click="removeBlocked(idx)" class="text-red-400 hover:text-red-600"><X class="w-3 h-3" /></button>
          </span>
          <span v-if="!settings.blockedPhones.length" class="text-xs text-stone-400">No blocked numbers</span>
        </div>
        <div class="flex gap-2">
          <input v-model="newBlockedPhone" type="text" placeholder="+60123456789" class="flex-1 max-w-xs bg-stone-200 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" @keyup.enter="addBlocked" />
          <BaseButton variant="secondary" size="sm" @click="addBlocked" :disabled="!newBlockedPhone.trim()">Add</BaseButton>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <details class="bg-stone-100 rounded-xl mb-4">
      <summary class="px-5 py-3 text-xs font-semibold text-stone-500 uppercase cursor-pointer">Instructions</summary>
      <div class="px-5 pb-4 text-xs text-stone-600 space-y-1">
        <template v-if="activeTab === 'EMPLOYEE'">
          <p>Staff can text the connected WhatsApp number to:</p>
          <p>- Check product stock and prices ("how much sawi in stock?")</p>
          <p>- Create quotation drafts ("quotation for sawi 50kg, kangkong 30 bundles")</p>
          <p>- Check today's orders and pending orders</p>
          <p>- Look up customer info and search contacts</p>
          <p>- Check customer outstanding balance ("how much does Lim Ah Seng owe?")</p>
          <p>- Record stock adjustments ("wastage 5kg sawi expired")</p>
          <p>- View low stock alerts and recent price changes</p>
          <p class="mt-2 font-medium text-stone-700">Media Support:</p>
          <p>- Send a voice note — it will be transcribed and processed automatically</p>
          <p>- Send an image (e.g. handwritten order) — items will be extracted from it</p>
          <p class="mt-2 font-medium text-stone-700">Multi-language:</p>
          <p>- Supports English, Malay (BM), and Chinese — replies in the same language</p>
          <p class="mt-2 text-stone-400">Employee phones are auto-detected from staff profiles (User → phone field).</p>
        </template>
        <template v-else>
          <p>Customers can text the connected WhatsApp number to:</p>
          <p>- Check product availability and prices</p>
          <p>- View available product categories</p>
          <p>- Ask about delivery areas and slots</p>
          <p>- Track their orders by phone number or order number</p>
          <p>- Place orders directly via WhatsApp ("I want 5kg kangkung for tomorrow AM")</p>
          <p>- Repeat their last order ("same as last time")</p>
          <p class="mt-2 font-medium text-stone-700">Media Support:</p>
          <p>- Send a voice note to order or ask questions hands-free</p>
          <p>- Send a photo of an order list — items will be extracted and offered for ordering</p>
          <p class="mt-2 font-medium text-stone-700">Multi-language:</p>
          <p>- Supports English, Malay (BM), and Chinese — auto-detects and replies in the same language</p>
        </template>
      </div>
    </details>

    <!-- Chat Logs -->
    <div class="bg-white border border-stone-200 rounded-xl overflow-hidden" style="height: 500px">
      <div class="flex h-full">
        <!-- Chat list (left) -->
        <div class="w-1/3 border-r border-stone-200 flex flex-col">
          <div class="p-3 border-b border-stone-200">
            <input v-model="chatSearch" type="text" placeholder="Search chats..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500" />
          </div>
          <div class="flex-1 overflow-y-auto">
            <div v-if="!filteredChats.length" class="p-4 text-center text-stone-400 text-xs">No conversations yet</div>
            <div v-for="chat in filteredChats" :key="chat.id"
              @click="selectChat(chat)"
              class="px-3 py-3 border-b border-stone-100 cursor-pointer transition-colors"
              :class="selectedChat?.id === chat.id ? 'bg-green-50' : 'hover:bg-stone-50'"
            >
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" :class="chat.agentType === 'EMPLOYEE' ? 'bg-green-200 text-green-700' : 'bg-blue-200 text-blue-700'">
                  {{ (chat.contactName || chat.phone)?.[0]?.toUpperCase() || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-stone-900 truncate">{{ chat.contactName || chat.phone }}</span>
                    <span class="text-[10px] text-stone-400 shrink-0">{{ timeAgo(chat.lastMessageAt) }}</span>
                  </div>
                  <p class="text-[10px] text-stone-500 truncate">{{ chat.lastMessage }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Messages (right) -->
        <div class="flex-1 flex flex-col">
          <div v-if="!selectedChat" class="flex-1 flex items-center justify-center text-stone-400 text-sm">
            <div class="text-center">
              <MessageCircle class="w-10 h-10 mx-auto mb-2 text-stone-300" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
          <template v-else>
            <!-- Chat header -->
            <div class="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-stone-900">{{ selectedChat.contactName || selectedChat.phone }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded" :class="selectedChat.agentType === 'EMPLOYEE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'">{{ selectedChat.agentType }}</span>
              </div>
              <button @click="handleDeleteChat" class="text-stone-400 hover:text-red-500 text-xs">Delete Chat</button>
            </div>

            <!-- Messages -->
            <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-100/50">
              <div v-if="loadingMessages" class="text-center text-stone-400 text-xs py-8">Loading messages...</div>
              <div v-else v-for="msg in chatMessages" :key="msg.id"
                class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div class="max-w-[75%] rounded-xl px-3 py-2 text-sm" :class="msg.role === 'user' ? 'bg-green-600 text-white rounded-br-sm' : 'bg-white text-stone-900 border border-stone-200 rounded-bl-sm'">
                  <p class="whitespace-pre-wrap text-xs leading-relaxed">{{ msg.content }}</p>
                  <p class="text-[9px] mt-1" :class="msg.role === 'user' ? 'text-green-200' : 'text-stone-400'">{{ formatTime(msg.createdAt) }}</p>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import { useConfirm } from '../../composables/useConfirm'
import BaseButton from '../../components/base/BaseButton.vue'
import { X, MessageCircle } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()

const activeTab = ref<'EMPLOYEE' | 'CLIENT'>('EMPLOYEE')
const waConnected = ref(false)
const stats = ref({ totalChats: 0, employeeChats: 0, clientChats: 0, todayMessages: 0 })
const settings = ref({ employeeActive: true, clientActive: true, clientGreeting: '', blockedPhones: [] as string[] })
const newBlockedPhone = ref('')

const chats = ref<any[]>([])
const chatSearch = ref('')
const selectedChat = ref<any>(null)
const chatMessages = ref<any[]>([])
const loadingMessages = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const isActiveAgent = computed(() =>
  activeTab.value === 'EMPLOYEE' ? settings.value.employeeActive : settings.value.clientActive
)

const filteredChats = computed(() => {
  let list = chats.value.filter((c) => c.agentType === activeTab.value)
  if (chatSearch.value) {
    const q = chatSearch.value.toLowerCase()
    list = list.filter((c) => c.phone.includes(q) || c.contactName?.toLowerCase().includes(q))
  }
  return list
})

function timeAgo(d: string | null): string {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

async function fetchAll() {
  try {
    const [statusRes, statsRes, settingsRes, chatsRes] = await Promise.all([
      api.get('/whatsapp/status'),
      api.get('/whatsapp-agents/stats'),
      api.get('/whatsapp-agents/settings'),
      api.get('/whatsapp-agents/chats', { params: { limit: '100' } }),
    ])
    waConnected.value = statusRes.data.data.status === 'connected'
    stats.value = statsRes.data.data
    settings.value = settingsRes.data.data
    chats.value = chatsRes.data.data
  } catch {}
}

async function toggleAgent() {
  if (activeTab.value === 'EMPLOYEE') {
    settings.value.employeeActive = !settings.value.employeeActive
  } else {
    settings.value.clientActive = !settings.value.clientActive
  }
  await saveSettings()
}

async function saveSettings() {
  try {
    await api.put('/whatsapp-agents/settings', {
      employeeActive: settings.value.employeeActive,
      clientActive: settings.value.clientActive,
      clientGreeting: settings.value.clientGreeting,
      blockedPhones: settings.value.blockedPhones,
    })
  } catch (e: any) {
    toast.error('Failed to save settings')
  }
}

function addBlocked() {
  const num = newBlockedPhone.value.trim()
  if (!num) return
  if (settings.value.blockedPhones.includes(num)) { toast.error('Already blocked'); return }
  settings.value.blockedPhones.push(num)
  newBlockedPhone.value = ''
  saveSettings()
}

function removeBlocked(idx: number) {
  settings.value.blockedPhones.splice(idx, 1)
  saveSettings()
}

async function selectChat(chat: any) {
  selectedChat.value = chat
  loadingMessages.value = true
  try {
    const { data } = await api.get(`/whatsapp-agents/chats/${chat.id}/messages`, { params: { limit: '100' } })
    chatMessages.value = data.data.messages
    await nextTick()
    if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  } catch {
    toast.error('Failed to load messages')
  } finally {
    loadingMessages.value = false
  }
}

async function handleDeleteChat() {
  if (!selectedChat.value) return
  if (!(await confirm.show('Delete Chat', 'Delete this chat and all messages?'))) return
  try {
    await api.delete(`/whatsapp-agents/chats/${selectedChat.value.id}`)
    toast.success('Chat deleted')
    selectedChat.value = null
    chatMessages.value = []
    fetchAll()
  } catch { toast.error('Failed to delete') }
}

watch(activeTab, () => { selectedChat.value = null; chatMessages.value = [] })
onMounted(() => fetchAll())
</script>
