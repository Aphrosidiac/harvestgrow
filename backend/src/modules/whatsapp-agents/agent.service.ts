import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { EMPLOYEE_TOOLS, CLIENT_TOOLS, executeTool } from './agent-tools.js'
import type { MediaAttachment } from '../whatsapp/whatsapp.service.js'

const apiKey = process.env.ANTHROPIC_API_KEY
const client = apiKey ? new Anthropic({ apiKey }) : null

const EMPLOYEE_SYSTEM = `You are HG Assistant on WhatsApp for HarvestGrow Veg Sdn Bhd staff.
You help employees with:
- Searching products and checking stock levels
- Looking up prices (current and recent changes)
- Checking today's orders and pending orders
- Finding customer information
- Creating draft quotations/sales orders
- Checking customer outstanding balances
- Recording stock adjustments (wastage, returns, stock-in)

Keep responses SHORT — this is WhatsApp on a phone. Use bullet points, not paragraphs.
Currency: RM (Malaysian Ringgit). Always show 2 decimal places.
Never fabricate data — use tools to look up real numbers.
If asked to create a quotation, confirm the items before creating it.

Multi-language: Respond in the same language the user writes in (English, Malay/Bahasa, or Chinese). If they write in Malay, reply in Malay. If they write in Chinese, reply in Chinese. Default to English if unsure.

If the user sends a voice message, it will be transcribed for you — respond normally to the transcribed content.
If the user sends an image (e.g. a handwritten order list), extract the items and quantities from it and help them proceed.`

const CLIENT_SYSTEM = `You are HarvestGrow's friendly customer service assistant on WhatsApp.
HarvestGrow Veg Sdn Bhd is a vegetable and fresh produce supplier in Johor Bahru, Malaysia.

You help customers with:
- Checking product availability and prices
- Listing available products by category
- Delivery information (slots, areas, cutoff times)
- Tracking their orders
- Placing new orders directly via WhatsApp
- Repeating their previous orders

Be warm, professional, and concise — this is WhatsApp.
Currency: RM. Always say "RM X.XX".
Never share cost prices, internal data, or staff information.

When a customer wants to place an order:
1. Help them pick items (use tools to check availability)
2. Confirm the full item list, quantities, delivery date and slot
3. Only call place_order after the customer confirms everything

Multi-language: Respond in the same language the user writes in (English, Malay/Bahasa, or Chinese). If they write "Saya nak order sayur", reply in Malay. If they write "我要订菜", reply in Chinese. Default to English if unsure.

If the user sends a voice message, it will be transcribed for you — respond normally to the transcribed content.
If the user sends an image (e.g. a photo of their order list or a product they want), extract relevant information and help them.`

let prisma: PrismaClient | null = null

const phoneRateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 5 * 60 * 1000

function isPhoneRateLimited(phone: string): boolean {
  const now = Date.now()
  const entry = phoneRateLimit.get(phone)
  if (!entry || now > entry.resetAt) {
    phoneRateLimit.set(phone, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT_MAX
}

export function init(prismaClient: PrismaClient) {
  prisma = prismaClient
}

export async function processMessage(phone: string, text: string, contactName: string | null, media?: MediaAttachment): Promise<string | null> {
  if (!client || !prisma) return null

  if (isPhoneRateLimited(phone)) {
    return 'You are sending messages too quickly. Please wait a few minutes before trying again.'
  }

  const branch = await prisma.branch.findFirst({ where: { code: 'HG-JB' } })
  if (!branch) return null
  const branchId = branch.id

  const blockedRaw = await prisma.setting.findUnique({ where: { key: 'whatsapp.agent.employee.blocked' } })
  const blockedPhones: string[] = blockedRaw ? JSON.parse(blockedRaw.value) : []
  const cleanedPhone = phone.replace(/[^0-9]/g, '')
  if (blockedPhones.some((b) => cleanedPhone.includes(b.replace(/[^0-9]/g, '')))) return null

  const isEmployee = await prisma.user.findFirst({
    where: { branchId, isActive: true, phone: { not: null } },
    select: { phone: true },
  }).then(async () => {
    const users = await prisma!.user.findMany({ where: { branchId, isActive: true, phone: { not: null } }, select: { phone: true } })
    return users.some((u) => u.phone && cleanedPhone.includes(u.phone.replace(/[^0-9]/g, '')))
  })

  const agentType = isEmployee ? 'EMPLOYEE' : 'CLIENT'
  const settingKey = isEmployee ? 'whatsapp.agent.employee.active' : 'whatsapp.agent.client.active'
  const activeSetting = await prisma.setting.findUnique({ where: { key: settingKey } })
  if (activeSetting?.value === 'false') return null

  let chat = await prisma.whatsAppChat.findUnique({ where: { branchId_phone: { branchId, phone: cleanedPhone } } })
  if (!chat) {
    chat = await prisma.whatsAppChat.create({
      data: { branchId, phone: cleanedPhone, contactName, agentType },
    })
  } else if (chat.agentType !== agentType || (contactName && contactName !== chat.contactName)) {
    chat = await prisma.whatsAppChat.update({
      where: { id: chat.id },
      data: { agentType, ...(contactName && { contactName }) },
    })
  }

  const storedText = media?.type === 'audio' ? '[Voice message]' : media?.type === 'image' ? (media.caption || '[Image]') : text
  await prisma.whatsAppMessage.create({ data: { chatId: chat.id, role: 'user', content: storedText } })

  const historyLimit = isEmployee ? 20 : 10
  const history = await prisma.whatsAppMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: 'desc' },
    take: historyLimit,
  })
  history.reverse()

  const apiMessages: Anthropic.Messages.MessageParam[] = history.slice(0, -1).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  const currentMessageContent: Anthropic.Messages.ContentBlockParam[] = []

  if (media?.type === 'image') {
    currentMessageContent.push({
      type: 'image',
      source: { type: 'base64', media_type: media.mimeType as any, data: media.base64 },
    })
    if (media.caption) {
      currentMessageContent.push({ type: 'text', text: media.caption })
    } else {
      currentMessageContent.push({ type: 'text', text: 'The customer sent this image. Extract any order items, product names, or quantities you can see.' })
    }
  } else if (media?.type === 'audio') {
    currentMessageContent.push({
      type: 'text',
      text: `[The user sent a voice message. Please process this audio and respond to what they said.]`,
    })
    try {
      const transcribeResponse = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe this voice message exactly. Output only the transcription, nothing else. The speaker may use English, Malay, or Chinese.' },
            { type: 'document', source: { type: 'base64', media_type: media.mimeType as any, data: media.base64 } },
          ],
        }],
      })
      const transcription = transcribeResponse.content.find((b) => b.type === 'text')
      if (transcription && transcription.type === 'text') {
        currentMessageContent.length = 0
        currentMessageContent.push({ type: 'text', text: `[Voice message transcription]: ${transcription.text}` })
      }
    } catch (err: any) {
      console.error('[WhatsApp Agent] Audio transcription failed:', err.message)
      currentMessageContent.length = 0
      currentMessageContent.push({ type: 'text', text: 'Sorry, I could not process the voice message. Please type your message instead.' })
    }
  } else {
    currentMessageContent.push({ type: 'text', text })
  }

  apiMessages.push({ role: 'user', content: currentMessageContent })

  const tools = isEmployee ? EMPLOYEE_TOOLS : CLIENT_TOOLS
  const systemPrompt = isEmployee ? EMPLOYEE_SYSTEM : CLIENT_SYSTEM

  try {
    let response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      tools: tools as any,
      messages: apiMessages,
    })

    let iterations = 0
    while (response.stop_reason === 'tool_use' && iterations < 5) {
      iterations++
      const toolBlocks = response.content.filter((b) => b.type === 'tool_use')
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

      for (const block of toolBlocks) {
        if (block.type !== 'tool_use') continue
        const result = await executeTool(prisma, branchId, block.name, block.input)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }

      apiMessages.push({ role: 'assistant', content: response.content as any })
      apiMessages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        tools: tools as any,
        messages: apiMessages,
      })
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    const responseText = textBlock && textBlock.type === 'text' ? textBlock.text : 'Sorry, I could not process your request.'

    await prisma.whatsAppMessage.create({ data: { chatId: chat.id, role: 'assistant', content: responseText } })
    await prisma.whatsAppChat.update({
      where: { id: chat.id },
      data: { lastMessageAt: new Date(), messageCount: { increment: 2 } },
    })

    return responseText
  } catch (err: any) {
    console.error('[WhatsApp Agent] AI error:', err.message)
    return 'Sorry, I encountered an error. Please try again later.'
  }
}
