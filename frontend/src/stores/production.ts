import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'
import type { BoardCard, OrderStatus, ProductionAlert, ShopOrder } from '../types'

export const useProductionStore = defineStore('production', () => {
  const board = ref<Record<string, BoardCard[]>>({})
  const packQueue = ref<ShopOrder[]>([])
  const currentOrder = ref<ShopOrder | null>(null)
  const alerts = ref<ProductionAlert[]>([])
  const loading = ref(false)
  const lastShortages = ref<Array<{ stockItemId: string; itemName: string; available: number; required: number }> | null>(null)

  async function fetchBoard(date?: string, includeCompleted = false) {
    loading.value = true
    try {
      const { data } = await api.get('/production/board', {
        params: { date, includeCompleted: includeCompleted ? '1' : undefined },
      })
      board.value = data.data
    } finally { loading.value = false }
  }

  async function fetchPackQueue(date?: string) {
    const { data } = await api.get('/production/pack-queue', { params: { date } })
    packQueue.value = data.data
    return packQueue.value
  }

  async function fetchOrderDetail(id: string) {
    const { data } = await api.get(`/production/orders/${id}`)
    currentOrder.value = data.data
    return data.data as ShopOrder
  }

  async function markPicked(orderId: string, lineId: string) {
    const { data } = await api.post(`/production/orders/${orderId}/lines/${lineId}/picked`)
    return data.data
  }

  async function markPacked(orderId: string, lineId: string) {
    const { data } = await api.post(`/production/orders/${orderId}/lines/${lineId}/packed`)
    return data.data
  }

  async function advanceStatus(orderId: string, toStatus: OrderStatus, note?: string) {
    lastShortages.value = null
    try {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status: toStatus, note })
      return data.data as ShopOrder
    } catch (err: any) {
      if (err?.response?.status === 409 && err.response.data?.error === 'INSUFFICIENT_STOCK') {
        lastShortages.value = err.response.data.shortages
      }
      throw err
    }
  }

  async function fetchPackSheet(id: string) {
    const { data } = await api.get(`/production/orders/${id}/pack-sheet`)
    return data.data
  }

  async function fetchAlerts() {
    const { data } = await api.get('/production/alerts')
    alerts.value = data.data
    return alerts.value
  }

  return {
    board, packQueue, currentOrder, alerts, loading, lastShortages,
    fetchBoard, fetchPackQueue, fetchOrderDetail, markPicked, markPacked,
    advanceStatus, fetchPackSheet, fetchAlerts,
  }
})
