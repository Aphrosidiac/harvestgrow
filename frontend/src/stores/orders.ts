import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'
import type { ShopOrder, OrderStatus, PaginatedResponse } from '../types'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<ShopOrder[]>([])
  const currentOrder = ref<ShopOrder | null>(null)
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)
  const loading = ref(false)

  async function fetchOrders(params: Record<string, any> = {}) {
    loading.value = true
    try {
      const { data } = await api.get<PaginatedResponse<ShopOrder>>('/orders', {
        params: { page: page.value, limit: limit.value, ...params },
      })
      orders.value = data.data
      total.value = data.total
      totalPages.value = data.totalPages
    } finally { loading.value = false }
  }

  async function fetchOrder(id: string) {
    const { data } = await api.get(`/orders/${id}`)
    currentOrder.value = data.data
    return data.data as ShopOrder
  }

  async function updateStatus(id: string, status: OrderStatus) {
    const { data } = await api.patch(`/orders/${id}/status`, { status })
    return data.data as ShopOrder
  }

  async function cancelOrder(id: string) {
    const { data } = await api.post(`/orders/${id}/cancel`)
    return data.data as ShopOrder
  }

  async function generateInvoice(id: string, customerId?: string) {
    const { data } = await api.post(`/orders/${id}/generate-invoice`, { customerId })
    return data.data as { documentId: string; documentNumber: string; total: number; reused: boolean }
  }

  async function generateDeliveryOrder(id: string) {
    const { data } = await api.post(`/orders/${id}/generate-do`, {})
    return data.data as { documentId: string; documentNumber: string; reused: boolean }
  }

  async function promoteCustomer(id: string) {
    const { data } = await api.post(`/orders/${id}/promote-customer`, {})
    return data.data as { customerId: string; customerName: string }
  }

  async function bulkGenerateInvoices(date?: string) {
    const { data } = await api.post('/orders/bulk-generate-invoices', { date })
    return data.data as { generated: number; skipped: number; items: any[] }
  }

  return {
    orders, currentOrder, total, page, limit, totalPages, loading,
    fetchOrders, fetchOrder, updateStatus, cancelOrder,
    generateInvoice, generateDeliveryOrder, promoteCustomer, bulkGenerateInvoices,
  }
})
