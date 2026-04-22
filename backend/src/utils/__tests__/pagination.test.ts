import { describe, it, expect } from 'vitest'
import { getPaginationParams, paginatedResponse } from '../pagination.js'

describe('getPaginationParams', () => {
  it('returns defaults for empty query', () => {
    const result = getPaginationParams({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.skip).toBe(0)
  })

  it('parses page and limit from strings', () => {
    const result = getPaginationParams({ page: '3', limit: '50' })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(50)
    expect(result.skip).toBe(100)
  })

  it('clamps limit to max 100', () => {
    const result = getPaginationParams({ limit: '999' })
    expect(result.limit).toBe(100)
  })

  it('clamps page to min 1', () => {
    const result = getPaginationParams({ page: '-5' })
    expect(result.page).toBe(1)
    expect(result.skip).toBe(0)
  })

  it('handles NaN gracefully', () => {
    const result = getPaginationParams({ page: 'abc', limit: 'xyz' })
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })
})

describe('paginatedResponse', () => {
  it('builds correct response shape', () => {
    const result = paginatedResponse([{ id: 1 }, { id: 2 }], 50, 1, 20)
    expect(result).toEqual({
      success: true,
      data: [{ id: 1 }, { id: 2 }],
      total: 50,
      page: 1,
      limit: 20,
      totalPages: 3,
    })
  })

  it('calculates totalPages correctly', () => {
    const result = paginatedResponse([], 0, 1, 20)
    expect(result.totalPages).toBe(0)
  })

  it('handles exact page boundary', () => {
    const result = paginatedResponse([], 100, 1, 100)
    expect(result.totalPages).toBe(1)
  })
})
