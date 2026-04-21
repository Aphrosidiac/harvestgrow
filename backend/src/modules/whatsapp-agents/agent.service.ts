import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'
import { EMPLOYEE_TOOLS, CLIENT_TOOLS, executeTool } from './agent-tools.js'

const apiKey = process.env.ANTHROPIC_API_KEY
const client = apiKey ? new Anthropic({ apiKey }) : null

const EMPLOYEE_SYSTEM = `You are HG Assistant on WhatsApp for HarvestGrow Veg Sdn Bhd staff.
You help employees with:
- Searching products and checking stock levels
- Looking up prices (current and recent changes)
- Checking today's orders and pending orders
- Finding customer information
- Creating draft quotations/sales orders

Keep responses SHORT — this is WhatsApp on a phone. Use bullet points, not paragraphs.
Currency: RM (Malaysian Ringgit). Always show 2 decimal places.
Never fabricate data — use tools to look up real numbers.
If asked to create a quotation, confirm the items before creating it.`

const CLIENT_SYSTEM = `You are HarvestGrow's friendly customer service assistant on WhatsApp.
HarvestGrow Veg Sdn Bhd is a vegetable and fresh produce supplier in Johor Bahru, Malaysia.

You help customers with:
- Checking product availability and prices
- Listing available products by category
- Delivery information (slots, areas, cutoff times)
- Tracking their orders

Be warm, professional, and concise — this is WhatsApp.
Currency: RM. Always say "RM X.XX".
If the customer wants to place an order, direct them to call +607-511 2696 or the online shop.
Never share cost prices, internal data, or staff information.`

let prisma: PrismaClient | null = null

export function init(prismaClient: PrismaClient) {
  prisma = prismaClient
}

export async function processMessage(phone: string, text: string, contactName: string | null): Promise<string | null> {
  if (!client || !prisma) return null

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

  await prisma.whatsAppMessage.create({ data: { chatId: chat.id, role: 'user', content: text } })

  const historyLimit = isEmployee ? 20 : 10
  const history = await prisma.whatsAppMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: 'desc' },
    take: historyLimit,
  })
  history.reverse()

  const apiMessages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

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
