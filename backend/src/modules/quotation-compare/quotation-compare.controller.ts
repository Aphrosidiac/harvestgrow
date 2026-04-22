import { FastifyRequest, FastifyReply } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY
const client = apiKey ? new Anthropic({ apiKey }) : null

const EXTRACTION_PROMPT = `You are a data extraction assistant for a vegetable/produce supplier.
Extract ALL product items and their prices from this supplier quotation PDF.

Return ONLY a valid JSON object with this exact structure:
{
  "supplier": "the supplier/company name found in the document",
  "items": [
    { "product": "product name", "unit": "kg/pcs/bundle/pack", "price": 0.00 }
  ]
}

Rules:
- Extract every single line item with a price
- Normalize product names to English where possible
- Use lowercase for units (kg, pcs, bundle, pack, box)
- Price should be a number (no currency symbols)
- If supplier name is not clear, use the filename or "Unknown Supplier"
- Return ONLY the JSON, no markdown, no explanation`

const SUMMARY_PROMPT = `You are a procurement advisor for a vegetable/produce supplier called HarvestGrow.
Analyze this price comparison data and provide a brief recommendation.

Data:
{DATA}

Write a short summary (3-5 sentences) that:
1. Names the overall cheapest supplier
2. Highlights which specific products have the best deals
3. Notes any significant price differences worth attention
4. Gives a clear recommendation

IMPORTANT: Write in plain text only. Do NOT use any markdown formatting — no **, no #, no *, no bullet points. Just clean readable sentences. Use RM (Malaysian Ringgit) for currency.`

interface ExtractedItem {
  product: string
  unit: string
  price: number
}

interface SupplierData {
  supplier: string
  items: ExtractedItem[]
}

export async function compareQuotations(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!client) {
    return reply.status(503).send({ success: false, message: 'ANTHROPIC_API_KEY not configured' })
  }

  const parts = request.parts()
  const files: { filename: string; data: Buffer; mimetype: string }[] = []
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

  for await (const part of parts) {
    if (part.type === 'file' && ALLOWED_TYPES.includes(part.mimetype)) {
      const chunks: Buffer[] = []
      for await (const chunk of part.file) {
        chunks.push(chunk)
      }
      files.push({ filename: part.filename, data: Buffer.concat(chunks), mimetype: part.mimetype })
    }
  }

  if (files.length < 2) {
    return reply.status(400).send({ success: false, message: 'Please upload at least 2 quotation files to compare' })
  }

  if (files.length > 10) {
    return reply.status(400).send({ success: false, message: 'Maximum 10 files allowed' })
  }

  const supplierResults: SupplierData[] = []

  for (const file of files) {
    try {
      const base64Data = file.data.toString('base64')

      const contentBlock = file.mimetype === 'application/pdf'
        ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64Data } }
        : { type: 'image' as const, source: { type: 'base64' as const, media_type: file.mimetype as any, data: base64Data } }

      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              contentBlock,
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      })

      const textBlock = response.content.find((b) => b.type === 'text')
      if (textBlock && textBlock.type === 'text') {
        let jsonStr = textBlock.text.trim()
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) jsonStr = jsonMatch[0]

        const parsed = JSON.parse(jsonStr) as SupplierData
        if (!parsed.supplier) parsed.supplier = file.filename.replace('.pdf', '')
        supplierResults.push(parsed)
      }
    } catch (err: any) {
      request.log.error({ err, filename: file.filename }, 'Failed to extract from PDF')
      supplierResults.push({
        supplier: file.filename.replace('.pdf', ''),
        items: [],
      })
    }
  }

  const suppliers = supplierResults.map((s) => s.supplier)
  const productMap = new Map<string, { unit: string; prices: Record<string, number> }>()

  for (const sd of supplierResults) {
    for (const item of sd.items) {
      const key = item.product.toLowerCase().trim()
      if (!productMap.has(key)) {
        productMap.set(key, { unit: item.unit, prices: {} })
      }
      productMap.get(key)!.prices[sd.supplier] = item.price
    }
  }

  const comparisonItems = [...productMap.entries()].map(([key, val]) => {
    const priceEntries = Object.entries(val.prices)
    const cheapestEntry = priceEntries.reduce((min, curr) =>
      curr[1] < min[1] ? curr : min, priceEntries[0])

    return {
      product: key.charAt(0).toUpperCase() + key.slice(1),
      unit: val.unit,
      prices: val.prices,
      cheapest: cheapestEntry?.[0] || '',
      cheapestPrice: cheapestEntry?.[1] || 0,
    }
  }).sort((a, b) => a.product.localeCompare(b.product))

  let summary = ''
  try {
    const summaryResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: SUMMARY_PROMPT.replace('{DATA}', JSON.stringify({ suppliers, items: comparisonItems }, null, 2)),
        },
      ],
    })
    const summaryBlock = summaryResponse.content.find((b) => b.type === 'text')
    if (summaryBlock && summaryBlock.type === 'text') {
      summary = summaryBlock.text
    }
  } catch {
    summary = `Comparison complete. ${comparisonItems.length} products compared across ${suppliers.length} suppliers.`
  }

  // Save comparison to history
  try {
    await request.server.prisma.quotationComparison.create({
      data: {
        branchId: request.user.branchId,
        suppliers: suppliers,
        items: comparisonItems,
        summary,
        createdById: request.user.userId,
      },
    })
  } catch (err) {
    request.log.error(err, 'Failed to save comparison history')
  }

  return reply.send({
    success: true,
    data: {
      suppliers,
      items: comparisonItems,
      summary,
    },
  })
}

export async function listComparisons(request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) {
  const { branchId } = request.user
  const page = Math.max(1, parseInt(request.query.page ?? '1'))
  const limit = Math.min(50, Math.max(1, parseInt(request.query.limit ?? '20')))
  const skip = (page - 1) * limit

  const [data, total] = await Promise.all([
    request.server.prisma.quotationComparison.findMany({
      where: { branchId },
      select: { id: true, title: true, suppliers: true, summary: true, createdAt: true, createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
    }),
    request.server.prisma.quotationComparison.count({ where: { branchId } }),
  ])

  return reply.send({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) })
}

export async function getComparison(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { branchId } = request.user
  const comparison = await request.server.prisma.quotationComparison.findFirst({
    where: { id: request.params.id, branchId },
    include: { createdBy: { select: { name: true } } },
  })
  if (!comparison) return reply.status(404).send({ success: false, message: 'Comparison not found' })
  return reply.send({ success: true, data: comparison })
}

export async function deleteComparison(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { branchId } = request.user
  const existing = await request.server.prisma.quotationComparison.findFirst({ where: { id: request.params.id, branchId } })
  if (!existing) return reply.status(404).send({ success: false, message: 'Not found' })
  await request.server.prisma.quotationComparison.delete({ where: { id: request.params.id } })
  return reply.send({ success: true, message: 'Deleted' })
}
