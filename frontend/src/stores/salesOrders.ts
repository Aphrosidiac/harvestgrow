import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'
import type { SalesOrder } from '../types'

export const useSalesOrderStore = defineStore('salesOrders', () => {
  const salesOrders = ref<SalesOrder[]>([])
  const total = ref(0)
  const loading = ref(false)

  async function fetchSalesOrders(params: Record<string, any> = {}) {
    loading.value = true
    try {
      const { data } = await api.get('/sales-orders', { params })
      salesOrders.value = data.data
      total.value = data.total
      return data
    } finally {
      loading.value = false
    }
  }

  async function getSalesOrder(id: string) {
    const { data } = await api.get(`/sales-orders/${id}`)
    return data.data as SalesOrder
  }

  async function createSalesOrder(payload: any) {
    const { data } = await api.post('/sales-orders', payload)
    return data.data as SalesOrder
  }

  async function updateSalesOrder(id: string, payload: any) {
    const { data } = await api.put(`/sales-orders/${id}`, payload)
    return data.data as SalesOrder
  }

  async function deleteSalesOrder(id: string) {
    await api.delete(`/sales-orders/${id}`)
  }

  async function updateStatus(id: string, status: string) {
    const { data } = await api.patch(`/sales-orders/${id}/status`, { status })
    return data.data as SalesOrder
  }

  async function copySalesOrder(id: string) {
    const { data } = await api.post(`/sales-orders/${id}/copy`)
    return data.data as SalesOrder
  }

  async function fetchLastOrdered(stockItemId: string, customerId?: string) {
    const params: Record<string, string> = { stockItemId }
    if (customerId) params.customerId = customerId
    const { data } = await api.get('/sales-orders/last-ordered', { params })
    return data.data as Array<{
      quantity: number; unit: string; unitPrice: number; total: number
      salesOrder: { deliveryDate: string; salesOrderNumber: string }
    }>
  }

  async function fetchStockUomVariants(stockItemId: string) {
    const { data } = await api.get(`/stock/${stockItemId}/uom-variants`)
    return data.data as Array<{
      id: string; stockItemId: string; uomCode: string; price: number
      isBase: boolean; weightKg?: number; isActive: boolean
    }>
  }

  return {
    salesOrders, total, loading,
    fetchSalesOrders, getSalesOrder, createSalesOrder,
    updateSalesOrder, deleteSalesOrder, updateStatus, copySalesOrder,
    fetchLastOrdered, fetchStockUomVariants,
  }
})
