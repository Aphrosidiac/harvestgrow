<template>
  <div class="max-w-2xl">
    <!-- Connection Status -->
    <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
      <h3 class="text-sm font-semibold text-stone-500 uppercase mb-4">WhatsApp Connection</h3>

      <!-- Error banner -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="text-sm text-red-700 font-medium">Connection Error</p>
          <p class="text-xs text-red-600 mt-0.5">{{ errorMessage }}</p>
        </div>
        <button @click="errorMessage = ''" class="text-red-400 hover:text-red-600"><X class="w-4 h-4" /></button>
      </div>

      <!-- Connected -->
      <div v-if="status === 'connected'" class="flex items-center gap-4">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle class="w-6 h-6 text-green-600" />
        </div>
        <div class="flex-1">
          <p class="text-stone-900 font-semibold">Connected</p>
          <p class="text-stone-500 text-sm">Phone: +{{ phone || 'Unknown' }}</p>
        </div>
        <BaseButton variant="secondary" size="sm" :loading="disconnecting" @click="handleDisconnect" class="!text-red-500 !border-red-300 hover:!bg-red-50">
          Disconnect
        </BaseButton>
      </div>

      <!-- QR Code -->
      <div v-else-if="status === 'qr'" class="text-center">
        <div class="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-lg mb-4">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Waiting for scan...
        </div>
        <div class="inline-block p-4 bg-white border-2 border-stone-200 rounded-xl shadow-sm">
          <img v-if="qrCode" :src="qrCode" alt="WhatsApp QR Code" class="w-64 h-64" />
          <div v-else class="w-64 h-64 flex items-center justify-center">
            <div class="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full" />
          </div>
        </div>
        <p class="text-xs text-stone-500 mt-3">Open WhatsApp on your phone</p>
        <p class="text-xs text-stone-400">Go to <strong>Settings → Linked Devices → Link a Device</strong></p>
        <p class="text-xs text-stone-400 mt-2">QR code refreshes automatically. If expired, click reconnect below.</p>
        <button @click="handleConnect" class="mt-3 text-xs text-green-600 hover:text-green-700 underline">Regenerate QR</button>
      </div>

      <!-- Connecting / Loading -->
      <div v-else-if="status === 'connecting' || waitingForQR" class="text-center py-8">
        <div class="animate-spin w-10 h-10 border-3 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-stone-700 font-medium">Initializing WhatsApp...</p>
        <p class="text-stone-400 text-xs mt-1">This may take a few seconds</p>
      </div>

      <!-- Disconnected -->
      <div v-else class="text-center py-6">
        <div class="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageCircle class="w-8 h-8 text-stone-400" />
        </div>
        <p class="text-stone-700 font-medium mb-1">WhatsApp is not connected</p>
        <p class="text-stone-400 text-xs mb-5">Connect your WhatsApp account to enable quotation broadcasting</p>
        <BaseButton variant="primary" @click="handleConnect">
          <MessageCircle class="w-4 h-4 mr-1.5" /> Connect WhatsApp
        </BaseButton>
      </div>
    </div>

    <!-- Test Message (only when connected) -->
    <div v-if="status === 'connected'" class="bg-white border border-stone-200 rounded-xl p-6">
      <h3 class="text-sm font-semibold text-stone-500 uppercase mb-4">Send Test Message</h3>
      <div class="space-y-4">
        <div>
          <BaseInput v-model="testPhone" label="Phone Number" placeholder="e.g. +60123456789 or 0123456789" />
          <p class="text-xs text-stone-400 mt-1">Include country code (60 for MY, 65 for SG) or start with 0</p>
        </div>
        <div>
          <label class="block text-xs text-stone-500 mb-1">Message</label>
          <textarea v-model="testMessage" rows="3" placeholder="Type your test message..." class="w-full bg-stone-200 border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/50 placeholder:text-stone-500 resize-none" />
        </div>
        <div class="flex items-center gap-3">
          <BaseButton variant="primary" size="sm" :loading="sending" @click="handleTestSend">
            <SendIcon class="w-4 h-4 mr-1.5" /> Send Test
          </BaseButton>
          <span v-if="testResult === 'ok'" class="text-green-600 text-xs flex items-center gap-1"><CheckCircle class="w-3.5 h-3.5" /> Sent successfully</span>
          <span v-if="testResult === 'fail'" class="text-red-500 text-xs flex items-center gap-1"><AlertCircle class="w-3.5 h-3.5" /> Failed to send</span>
        </div>
      </div>
    </div>

    <!-- Connection Info -->
    <div class="mt-6 bg-stone-100 rounded-xl p-5">
      <h4 class="text-xs font-semibold text-stone-500 uppercase mb-2">How it works</h4>
      <ul class="text-xs text-stone-500 space-y-1">
        <li>1. Click "Connect WhatsApp" — a QR code will appear</li>
        <li>2. Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</li>
        <li>3. Scan the QR code — connection will be established automatically</li>
        <li>4. Once connected, the system can send quotations via WhatsApp</li>
        <li>5. The session stays active until you disconnect or the phone logs out</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../../lib/api'
import { useToast } from '../../composables/useToast'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseInput from '../../components/base/BaseInput.vue'
import { CheckCircle, MessageCircle, Send as SendIcon, AlertCircle, X } from 'lucide-vue-next'

const toast = useToast()

const status = ref<string>('disconnected')
const phone = ref<string>('')
const qrCode = ref<string>('')
const waitingForQR = ref(false)
const disconnecting = ref(false)
const sending = ref(false)
const errorMessage = ref('')
const testPhone = ref('')
const testMessage = ref('Hello from HarvestGrow ERP! This is a test message.')
const testResult = ref<'' | 'ok' | 'fail'>('')

let pollInterval: ReturnType<typeof setInterval> | null = null
let pollCount = 0

async function fetchStatus() {
  try {
    const { data } = await api.get('/whatsapp/status')
    const newStatus = data.data.status
    phone.value = data.data.phone || ''

    if (newStatus === 'qr' && data.data.hasQR) {
      try {
        const { data: qrData } = await api.get('/whatsapp/qr')
        qrCode.value = qrData.data.qr || ''
      } catch {
        qrCode.value = ''
      }
    }

    if (newStatus === 'connected') {
      waitingForQR.value = false
      errorMessage.value = ''
      toast.success(`WhatsApp connected! Phone: +${phone.value}`)
      stopPolling()
    }

    status.value = newStatus
    if (newStatus !== 'disconnected') waitingForQR.value = false
  } catch (err: any) {
    pollCount++
    if (pollCount > 20) {
      errorMessage.value = 'Connection timed out. Please try again.'
      waitingForQR.value = false
      stopPolling()
    }
  }
}

async function handleConnect() {
  errorMessage.value = ''
  waitingForQR.value = true
  qrCode.value = ''
  pollCount = 0

  try {
    await api.post('/whatsapp/connect')
    startPolling()
  } catch (e: any) {
    const msg = e.response?.data?.message || e.message || 'Failed to initialize WhatsApp connection'
    errorMessage.value = msg
    toast.error(msg)
    waitingForQR.value = false
  }
}

async function handleDisconnect() {
  disconnecting.value = true
  errorMessage.value = ''
  try {
    await api.post('/whatsapp/disconnect')
    status.value = 'disconnected'
    phone.value = ''
    qrCode.value = ''
    toast.success('WhatsApp disconnected')
  } catch (e: any) {
    const msg = e.response?.data?.message || 'Failed to disconnect'
    errorMessage.value = msg
    toast.error(msg)
  } finally {
    disconnecting.value = false
  }
}

async function handleTestSend() {
  testResult.value = ''

  if (!testPhone.value.trim()) {
    toast.error('Please enter a phone number')
    return
  }
  if (!testMessage.value.trim()) {
    toast.error('Please enter a message')
    return
  }

  const cleaned = testPhone.value.replace(/[^0-9+]/g, '')
  if (cleaned.length < 8) {
    toast.error('Phone number is too short. Include country code (e.g. +60123456789)')
    return
  }

  sending.value = true
  try {
    await api.post('/whatsapp/send', { phone: cleaned, message: testMessage.value })
    testResult.value = 'ok'
    toast.success('Test message sent!')
  } catch (e: any) {
    testResult.value = 'fail'
    const msg = e.response?.data?.message || 'Failed to send message'
    toast.error(msg)
    if (msg.includes('not connected')) {
      status.value = 'disconnected'
    }
  } finally {
    sending.value = false
  }
}

function startPolling() {
  stopPolling()
  pollCount = 0
  fetchStatus()
  pollInterval = setInterval(() => fetchStatus(), 3000)
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}

onMounted(async () => {
  try {
    await fetchStatus()
    if (status.value === 'qr' || status.value === 'connecting') {
      startPolling()
    }
  } catch {}
})

onUnmounted(() => stopPolling())
</script>
