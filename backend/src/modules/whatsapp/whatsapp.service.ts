import makeWASocket, { useMultiFileAuthState, DisconnectReason, WASocket } from 'baileys'
import * as QRCode from 'qrcode'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

const SESSION_DIR = join(process.cwd(), 'whatsapp-session')

let socket: WASocket | null = null
let currentQR: string | null = null
let connectionStatus: 'disconnected' | 'qr' | 'connecting' | 'connected' = 'disconnected'
let connectedPhone: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let messageHandler: ((phone: string, text: string, contactName: string | null) => Promise<string | null>) | null = null

export function onMessage(handler: (phone: string, text: string, contactName: string | null) => Promise<string | null>) {
  messageHandler = handler
}

export function getStatus() {
  return { status: connectionStatus, phone: connectedPhone, hasQR: !!currentQR }
}

export function getQR() {
  return currentQR
}

export async function initConnection() {
  if (connectionStatus === 'connected') {
    return { status: 'connected', message: 'Already connected' }
  }

  if (connectionStatus === 'connecting' || connectionStatus === 'qr') {
    return { status: connectionStatus, message: 'Connection in progress' }
  }

  connectionStatus = 'connecting'
  currentQR = null

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

    socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 30000,
      retryRequestDelayMs: 2000,
    })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          currentQR = await QRCode.toDataURL(qr)
          connectionStatus = 'qr'
          console.log('[WhatsApp] QR code generated — waiting for scan')
        } catch (err) {
          console.error('[WhatsApp] Failed to generate QR image:', err)
        }
      }

      if (connection === 'open') {
        currentQR = null
        connectionStatus = 'connected'
        connectedPhone = socket?.user?.id?.split(':')[0] || null
        console.log(`[WhatsApp] Connected as +${connectedPhone}`)
        clearReconnectTimer()
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut

        console.log(`[WhatsApp] Disconnected (code: ${statusCode}, reconnect: ${shouldReconnect})`)
        connectionStatus = 'disconnected'
        connectedPhone = null
        currentQR = null
        socket = null

        if (shouldReconnect) {
          console.log('[WhatsApp] Will reconnect in 5 seconds...')
          clearReconnectTimer()
          reconnectTimer = setTimeout(() => initConnection(), 5000)
        } else {
          cleanSession()
        }
      }
    })

    socket.ev.on('messages.upsert', async (m: any) => {
      if (!messageHandler) return
      for (const msg of m.messages || []) {
        if (msg.key.fromMe) continue
        if (msg.key.remoteJid?.endsWith('@g.us')) continue
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
        if (!text) continue
        const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
        if (!phone) continue
        const contactName = msg.pushName || null
        try {
          const reply = await messageHandler(phone, text, contactName)
          if (reply && socket) {
            await socket.sendMessage(msg.key.remoteJid!, { text: reply })
          }
        } catch (err) {
          console.error('[WhatsApp] Message handler error:', err)
        }
      }
    })

    return { status: 'connecting', message: 'Initializing connection...' }
  } catch (err: any) {
    console.error('[WhatsApp] Init error:', err)
    connectionStatus = 'disconnected'
    throw new Error(`Failed to initialize WhatsApp: ${err.message}`)
  }
}

export async function disconnect() {
  clearReconnectTimer()

  if (!socket) {
    connectionStatus = 'disconnected'
    connectedPhone = null
    currentQR = null
    cleanSession()
    return
  }

  try {
    await socket.logout()
  } catch (err) {
    console.error('[WhatsApp] Logout error (continuing):', err)
  }

  socket = null
  connectionStatus = 'disconnected'
  connectedPhone = null
  currentQR = null
  cleanSession()
}

export async function sendMessage(phone: string, text: string) {
  if (!socket) {
    throw new Error('WhatsApp is not initialized. Go to WhatsApp Settings and connect first.')
  }
  if (connectionStatus !== 'connected') {
    throw new Error(`WhatsApp is not connected (status: ${connectionStatus}). Please reconnect.`)
  }
  if (!phone || !phone.trim()) {
    throw new Error('Phone number is required')
  }
  if (!text || !text.trim()) {
    throw new Error('Message text is required')
  }

  const jid = formatJid(phone)

  try {
    await socket.sendMessage(jid, { text })
    return { success: true, phone, jid }
  } catch (err: any) {
    throw new Error(`Failed to send to ${phone}: ${err.message}`)
  }
}

function formatJid(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.slice(1)
  }
  if (cleaned.length < 8) {
    throw new Error(`Invalid phone number: ${phone}`)
  }
  return cleaned + '@s.whatsapp.net'
}

function cleanSession() {
  try {
    if (existsSync(SESSION_DIR)) {
      rmSync(SESSION_DIR, { recursive: true, force: true })
    }
  } catch (err) {
    console.error('[WhatsApp] Failed to clean session:', err)
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}
