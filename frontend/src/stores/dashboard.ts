import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'

interface DashboardStats {
  totalItems: number
  totalCustomers: number
  invoicesToday: number
  invoicesThisMonth: number
  revenueToday: number
  revenueThisMonth: number
  outstandingInvoices: number
  overdueInvoices: number
  pendingQuotations: number
  draftDocuments: number
  documentBreakdown: Record<string, number>
  todaysOrders: { count: number; total: number; byStatus: Record<string, number> }
  todaysDeliveries: { total: number; delivered: number; inProgress: number; pending: number; failed: number }
  topSellingItems: Array<{ stockItemId: string; itemName: string; totalQty: number }>
  dailySales: Array<{ date: string; total: number; count: number }>
  stockTurnover: Array<{ id: string; itemCode: string; description: string; quantity: number; uom: string; soldQty: number; daysOfCover: number | null }>
  productionBottlenecks: number
  recentPriceChanges: Array<{ id: string; itemCode: string; description: string; oldPrice: number; newPrice: number; deltaPct: number; changedAt: string; changedBy: string | null }>
}

interface RevenueDay {
  date: string
  revenue: number
  count: number
}

interface ActionItems {
  overdue: any[]
  pendingQuotations: any[]
  drafts: any[]
}

interface Activity {
  type: 'stock' | 'document' | 'payment'
  description: string
  by: string
  date: string
  link?: string
}

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats | null>(null)
  const revenueChart = ref<RevenueDay[]>([])
  const lowStock = ref<any[]>([])
  const recentInvoices = ref<any[]>([])
  const actionItems = ref<ActionItems | null>(null)
  const activities = ref<Activity[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const [statsRes, chartRes, lowStockRes, recentRes, actionsRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/revenue-chart'),
        api.get('/dashboard/low-stock'),
        api.get('/dashboard/recent-invoices'),
        api.get('/dashboard/action-items'),
        api.get('/dashboard/activity'),
      ])
      stats.value = statsRes.data.data
      revenueChart.value = chartRes.data.data
      lowStock.value = lowStockRes.data.data
      recentInvoices.value = recentRes.data.data
      actionItems.value = actionsRes.data.data
      activities.value = activityRes.data.data
    } catch (e: any) {
      error.value = e.response?.data?.message || 'Failed to load dashboard'
    } finally {
      loading.value = false
    }
  }

  return { stats, revenueChart, lowStock, recentInvoices, actionItems, activities, loading, error, fetchAll }
})
