import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validate } from '../validation.js'

function mockReply() {
  const reply: any = {
    statusCode: 200,
    body: null,
    status(code: number) { reply.statusCode = code; return reply },
    send(body: any) { reply.body = body; return reply },
  }
  return reply
}

describe('validate', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.coerce.number().int().min(0),
  })

  it('returns parsed data on valid input', () => {
    const reply = mockReply()
    const result = validate(schema, { name: 'Test', age: 25 }, reply)
    expect(result).toEqual({ name: 'Test', age: 25 })
    expect(reply.statusCode).toBe(200)
  })

  it('returns null and sends 400 on invalid input', () => {
    const reply = mockReply()
    const result = validate(schema, { name: '', age: -1 }, reply)
    expect(result).toBeNull()
    expect(reply.statusCode).toBe(400)
    expect(reply.body.success).toBe(false)
    expect(reply.body.message).toBe('Validation failed')
    expect(reply.body.errors).toBeDefined()
  })

  it('returns null on completely wrong input', () => {
    const reply = mockReply()
    const result = validate(schema, 'not an object', reply)
    expect(result).toBeNull()
    expect(reply.statusCode).toBe(400)
  })

  it('coerces string numbers', () => {
    const reply = mockReply()
    const result = validate(schema, { name: 'Test', age: '30' }, reply)
    expect(result).toEqual({ name: 'Test', age: 30 })
  })
})
