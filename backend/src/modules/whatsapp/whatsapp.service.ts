import makeWASocket, { useMultiFileAuthState, DisconnectReason, WASocket, downloadMediaMessage } from 'baileys'
import * as QRCode from 'qrcode'
import { join } from 'path'
import { existsSync, rmSync } from 'fs'

const SESSION_DIR = join(process.cwd(), 'whatsapp-session')
const MAX_RECONNECT_ATTEMPTS = 10

let socket: WASocket | null = null
let currentQR: string | null = null
let connectionStatus: 'disconnected' | 'qr' | 'connecting' | 'connected' = 'disconnected'
let connectedPhone: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
export type MediaAttachment = { type: 'image'; mimeType: string; base64: string; caption?: string } | { type: 'audio'; mimeType: string; base64: string }

let messageHandler: ((phone: string, text: string, contactName: string | null, media?: MediaAttachment) => Promise<string | null>) | null = null

export function onMessage(handler: (phone: string, text: string, contactName: string | null, media?: MediaAttachment) => Promise<string | null>) {
  messageHandler = handler
}

export function getStatus() {
  return { status: connectionStatus, phone: connectedPhone, hasQR: !!currentQR }
}

export function getQR() {
  return currentQR
}

function destroySocket() {
  if (socket) {
    try {
      socket.ev.removeAllListeners('creds.update')
      socket.ev.removeAllListeners('connection.update')
      socket.ev.removeAllListeners('messages.upsert')
      socket.end(undefined)
    } catch {}
    socket = null
  }
}

export async function initConnection(force = false) {
  if (connectionStatus === 'connected' && !force) {
    return { status: 'connected', message: 'Already connected' }
  }

  if ((connectionStatus === 'connecting' || connectionStatus === 'qr') && !force) {
    return { status: connectionStatus, message: 'Connection in progress' }
  }

  clearReconnectTimer()
  destroySocket()

  connectionStatus = 'connecting'
  currentQR = null
  connectedPhone = null

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
        reconnectAttempt = 0
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
        destroySocket()

        if (!shouldReconnect) {
          reconnectAttempt = 0
          cleanSession()
          return
        }

        if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
          console.log(`[WhatsApp] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached — giving up. Clean session and retry manually.`)
          reconnectAttempt = 0
          cleanSession()
          return
        }

        const delay = Math.min(5000 * Math.pow(2, reconnectAttempt), 300000)
        reconnectAttempt++
        console.log(`[WhatsApp] Will reconnect in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})...`)
        clearReconnectTimer()
        reconnectTimer = setTimeout(() => initConnection(), delay)
      }
    })

    socket.ev.on('messages.upsert', async (m: any) => {
      if (!messageHandler) return
      for (const msg of m.messages || []) {
        if (msg.key.fromMe) continue
        if (msg.key.remoteJid?.endsWith('@g.us')) continue

        const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
        if (!phone) continue
        const contactName = msg.pushName || null

        let text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
        let media: MediaAttachment | undefined

        if (msg.message?.imageMessage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
            const mime = msg.message.imageMessage.mimetype || 'image/jpeg'
            media = { type: 'image', mimeType: mime, base64: buffer.toString('base64'), caption: msg.message.imageMessage.caption || undefined }
            text = msg.message.imageMessage.caption || '[Image sent]'
          } catch (err) {
            console.error('[WhatsApp] Failed to download image:', err)
            text = '[Image could not be loaded]'
          }
        } else if (msg.message?.audioMessage) {
          try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
            const mime = msg.message.audioMessage.mimetype || 'audio/ogg; codecs=opus'
            media = { type: 'audio', mimeType: mime, base64: buffer.toString('base64') }
            text = '[Voice message]'
          } catch (err) {
            console.error('[WhatsApp] Failed to download audio:', err)
            text = '[Voice message could not be loaded]'
          }
        }

        if (!text && !media) continue

        try {
          const reply = await messageHandler(phone, text, contactName, media)
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
    destroySocket()
    cleanSession()
    throw new Error(`Failed to initialize WhatsApp: ${err.message}`)
  }
}

export async function disconnect() {
  clearReconnectTimer()
  reconnectAttempt = 0

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

  destroySocket()
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
