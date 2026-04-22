import { z, ZodSchema } from 'zod'
import { FastifyReply } from 'fastify'

export function validate<T>(schema: ZodSchema<T>, data: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    reply.status(400).send({
      success: false,
      message: 'Validation failed',
      errors: result.error.flatten().fieldErrors,
    })
    return null
  }
  return result.data
}

export const idParam = z.object({
  id: z.string().min(1, 'ID is required'),
})

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
})
