<template>
  <div>
    <!-- Production alert strip -->
    <div v-if="productionAlerts.length" class="mb-4 bg-red-600 text-white rounded-lg px-4 py-2 flex flex-wrap items-center gap-3 text-sm">
      <AlertTriangle class="w-4 h-4" />
      <div class="flex-1 flex flex-wrap gap-x-6 gap-y-1">
        <RouterLink
          v-for="a in productionAlerts"
          :key="a.orderId"
          :to="`/app/orders/${a.orderId}`"
          class="hover:underline"
        >
          {{ a.orderNumber }} — {{ a.slot }} slot, still {{ a.status }} ({{ a.minutesOverdue }}m overdue)
        </RouterLink>
      </div>
    </div>

    <div v-if="dashboard.loading" class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="animate-pulse bg-stone-200 rounded-xl h-24" />
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="animate-pulse bg-stone-200 rounded-xl h-24" />
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="animate-pulse bg-stone-200 rounded-xl h-64" />
        <div class="animate-pulse bg-stone-200 rounded-xl h-64" />
      </div>
    </div>

    <div v-else-if="dashboard.error" class="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
      <p class="text-red-400">{{ dashboard.error }}</p>
      <button @click="dashboard.fetchAll()" class="mt-3 text-sm text-green-600 hover:text-green-500">Retry</button>
    </div>

    <template v-else-if="dashboard.stats">
      <!-- Quick Actions -->
      <div class="flex items-center gap-2 mb-6">
        <RouterLink to="/app/documents/new?type=INVOICE" class="inline-flex items-center gap-1.5 bg-green-600 text-stone-50 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-500 transition-colors">
          <Plus class="w-4 h-4" /> New Invoice
        </RouterLink>
        <RouterLink to="/app/documents/new?type=QUOTATION" class="inline-flex items-center gap-1.5 bg-stone-200 text-stone-700 border border-stone-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-300 transition-colors">
          <Plus class="w-4 h-4" /> New Quotation
        </RouterLink>
        <a href="/app/shop-display" target="_blank" class="inline-flex items-center gap-1.5 bg-stone-200 text-green-600 border border-green-600/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600/10 transition-colors ml-auto">
          <Monitor class="w-4 h-4" /> Shop Display
        </a>
      </div>

      <!-- Stats Row 1 — Revenue -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue Today" :value="'RM ' + dashboard.stats.revenueToday.toFixed(2)" icon="trending-up" color="green" />
        <StatCard label="Revenue This Month" :value="'RM ' + dashboard.stats.revenueThisMonth.toFixed(2)" icon="trending-up" color="gold" />
        <StatCard label="Invoices Today" :value="dashboard.stats.invoicesToday" icon="file-text" color="blue" />
        <StatCard label="Invoices This Month" :value="dashboard.stats.invoicesThisMonth" icon="file-text" color="blue" />
      </div>

      <!-- Stats Row 2 — Counts & Alerts -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Stock Items" :value="dashboard.stats.totalItems" icon="package" color="gray" />
        <StatCard label="Total Customers" :value="dashboard.stats.totalCustomers" icon="users" color="gray" />
        <StatCard label="Outstanding" :value="dashboard.stats.outstandingInvoices" icon="clock" color="gold" :alert="dashboard.stats.outstandingInvoices > 0" />
        <StatCard label="Overdue" :value="dashboard.stats.overdueInvoices" icon="alert" color="red" :alert="dashboard.stats.overdueInvoices > 0" />
        <StatCard label="Drafts" :value="dashboard.stats.draftDocuments" icon="edit" color="gray" />
      </div>

      <!-- Charts Row -->
      <div class="grid lg:grid-cols-3 gap-6 mb-6">
        <!-- Revenue Chart (2/3) -->
        <div class="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Revenue (Last 7 Days)</h3>
          <div class="h-64">
            <Bar v-if="revenueChartData" :data="revenueChartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Document Breakdown (1/3) -->
        <div class="bg-white border border-stone-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Documents</h3>
          <div class="h-64 flex items-center justify-center">
            <Doughnut v-if="docChartData" :data="docChartData" :options="doughnutOptions" />
          </div>
        </div>
      </div>

      <!-- Action Items + Activity -->
      <div class="grid lg:grid-cols-3 gap-6 mb-6">
        <!-- Action Items (2/3) -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Overdue -->
          <BaseCard v-if="dashboard.actionItems?.overdue?.length" title="Overdue Invoices">
            <div class="space-y-2">
              <RouterLink
                v-for="inv in dashboard.actionItems.overdue"
                :key="inv.id"
                :to="`/app/documents/${inv.id}`"
                class="flex items-center justify-between py-2 border-b border-stone-200 last:border-0 hover:bg-stone-200/30 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <span class="font-mono text-red-400 text-sm">{{ inv.documentNumber }}</span>
                  <span class="text-stone-500 text-sm ml-2">{{ inv.customerName }}</span>
                </div>
                <div class="text-right">
                  <span class="text-stone-700 text-sm font-medium">RM {{ (Number(inv.totalAmount) - Number(inv.paidAmount)).toFixed(2) }}</span>
                  <p class="text-red-400 text-xs">Due {{ fmtDate(inv.dueDate) }}</p>
                </div>
              </RouterLink>
            </div>
          </BaseCard>

          <!-- Pending Quotations -->
          <BaseCard v-if="dashboard.actionItems?.pendingQuotations?.length" title="Pending Quotations">
            <div class="space-y-2">
              <RouterLink
                v-for="qt in dashboard.actionItems.pendingQuotations"
                :key="qt.id"
                :to="`/app/documents/${qt.id}`"
                class="flex items-center justify-between py-2 border-b border-stone-200 last:border-0 hover:bg-stone-200/30 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <span class="font-mono text-green-600 text-sm">{{ qt.documentNumber }}</span>
                  <span class="text-stone-500 text-sm ml-2">{{ qt.customerName }}</span>
                  <BaseBadge :color="qt.status === 'APPROVED' ? 'green' : 'blue'" class="ml-2">{{ qt.status }}</BaseBadge>
                </div>
                <span class="text-stone-700 text-sm font-medium">RM {{ Number(qt.totalAmount).toFixed(2) }}</span>
              </RouterLink>
            </div>
          </BaseCard>

          <!-- Low Stock -->
          <BaseCard v-if="dashboard.lowStock?.length" title="Low Stock Alert">
            <template #header-action>
              <div class="flex items-center gap-2">
                <BaseBadge color="red">{{ dashboard.lowStock.length }}</BaseBadge>
                <RouterLink to="/app/stock/low-stock" class="text-green-600 text-xs hover:text-green-500">View all</RouterLink>
              </div>
            </template>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              <div v-for="item in dashboard.lowStock" :key="item.id" class="flex items-center justify-between py-2 border-b border-stone-200 last:border-0">
                <div>
                  <span class="font-mono text-green-600 text-sm">{{ item.itemCode }}</span>
                  <span class="text-stone-600 text-sm ml-2">{{ item.description }}</span>
                </div>
                <span class="text-red-400 font-semibold text-sm">{{ item.quantity }} left</span>
              </div>
            </div>
          </BaseCard>
        </div>

        <!-- Activity Feed (1/3) -->
        <div class="bg-white border border-stone-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Recent Activity</h3>
          <div v-if="!dashboard.activities?.length" class="text-stone-500 text-sm text-center py-8">No recent activity.</div>
          <div v-else class="space-y-3">
            <div v-for="(a, i) in dashboard.activities" :key="i" class="flex gap-3">
              <div class="mt-1">
                <div :class="[
                  'w-2 h-2 rounded-full',
                  a.type === 'payment' ? 'bg-green-500' : a.type === 'stock' ? 'bg-blue-500' : 'bg-green-600',
                ]" />
              </div>
              <div class="flex-1 min-w-0">
                <component :is="a.link ? 'RouterLink' : 'p'" :to="a.link" class="text-stone-600 text-xs leading-relaxed break-words" :class="a.link && 'hover:text-green-600'">
                  {{ a.description }}
                </component>
                <p class="text-stone-400 text-xs mt-0.5">
                  {{ timeAgo(a.date) }}{{ a.by ? ` · ${a.by}` : '' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ PHASE 6 OPERATIONAL WIDGETS ═══ -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <!-- Today's Orders -->
        <BaseCard title="Today's Orders">
          <div class="text-3xl font-bold text-stone-900">{{ dashboard.stats.todaysOrders?.count ?? 0 }}</div>
          <div class="text-sm text-stone-500 mb-3">RM {{ (dashboard.stats.todaysOrders?.total ?? 0).toFixed(2) }}</div>
          <div class="flex flex-wrap gap-1">
            <BaseBadge
              v-for="(n, status) in (dashboard.stats.todaysOrders?.byStatus || {})"
              :key="status"
              :color="statusBadgeColor(status as string)"
            >{{ status }} · {{ n }}</BaseBadge>
          </div>
          <div v-if="!Object.keys(dashboard.stats.todaysOrders?.byStatus || {}).length" class="text-xs text-stone-400">No orders today.</div>
        </BaseCard>

        <!-- Today's Deliveries -->
        <BaseCard title="Today's Deliveries">
          <div class="flex items-center gap-4">
            <div class="relative w-20 h-20">
              <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e7e5e4" stroke-width="3"></circle>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#869940" stroke-width="3"
                  :stroke-dasharray="`${deliveryProgress * 100} 100`" stroke-linecap="round"></circle>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center text-sm font-bold text-olive">
                {{ Math.round(deliveryProgress * 100) }}%
              </div>
            </div>
            <div class="flex-1 text-xs space-y-0.5">
              <div><span class="text-green-600 font-semibold">{{ dashboard.stats.todaysDeliveries?.delivered ?? 0 }}</span> delivered</div>
              <div><span class="text-blue-500 font-semibold">{{ dashboard.stats.todaysDeliveries?.inProgress ?? 0 }}</span> in progress</div>
              <div><span class="text-stone-500 font-semibold">{{ dashboard.stats.todaysDeliveries?.pending ?? 0 }}</span> pending</div>
              <div v-if="(dashboard.stats.todaysDeliveries?.failed ?? 0) > 0"><span class="text-red-500 font-semibold">{{ dashboard.stats.todaysDeliveries?.failed }}</span> failed</div>
            </div>
          </div>
        </BaseCard>

        <!-- Production Bottleneck -->
        <BaseCard title="Production Bottleneck">
          <div
            class="text-4xl font-bold"
            :class="(dashboard.stats.productionBottlenecks ?? 0) > 0 ? 'text-red-500' : 'text-green-600'"
          >
            {{ dashboard.stats.productionBottlenecks ?? 0 }}
          </div>
          <p class="text-xs text-stone-500 mt-1">orders stuck >2h in PICKING/CUTTING/PACKING</p>
        </BaseCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Daily Sales Line Chart (2/3) -->
        <div class="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Daily Sales (Last 14 days)</h3>
          <div class="h-64">
            <Line v-if="dailySalesChartData" :data="dailySalesChartData" :options="lineOptions" />
          </div>
        </div>

        <!-- Top Selling (1/3) -->
        <div class="bg-white border border-stone-200 rounded-xl p-6">
          <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Top Selling (7 days)</h3>
          <div class="h-64">
            <Bar v-if="topSellingChartData" :data="topSellingChartData" :options="horizontalBarOptions" />
            <div v-else class="text-stone-400 text-sm text-center py-12">No sales data.</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Stock Turnover -->
        <BaseCard title="Stock Turnover (Top 10 fastest movers)">
          <div v-if="!dashboard.stats.stockTurnover?.length" class="text-stone-500 text-sm py-4 text-center">No movement in the last 7 days.</div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="text-stone-500">
                <tr class="border-b border-stone-200">
                  <th class="text-left py-2">Item</th>
                  <th class="text-right py-2">Sold</th>
                  <th class="text-right py-2">Stock</th>
                  <th class="text-right py-2">Days Cover</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100">
                <tr v-for="it in dashboard.stats.stockTurnover" :key="it.id">
                  <td class="py-2"><span class="font-mono text-green-600">{{ it.itemCode }}</span> — {{ it.description }}</td>
                  <td class="py-2 text-right font-medium">{{ it.soldQty }}</td>
                  <td class="py-2 text-right">{{ it.quantity }}</td>
                  <td class="py-2 text-right">
                    <span :class="it.daysOfCover !== null && it.daysOfCover < 3 ? 'text-red-500 font-semibold' : ''">
                      {{ it.daysOfCover !== null ? `${it.daysOfCover}d` : '—' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>

        <!-- Recent Price Changes -->
        <BaseCard title="Recent Price Changes">
          <div v-if="!dashboard.stats.recentPriceChanges?.length" class="text-stone-500 text-sm py-4 text-center">No price changes yet.</div>
          <div v-else class="space-y-1.5 max-h-80 overflow-y-auto">
            <div v-for="p in dashboard.stats.recentPriceChanges" :key="p.id" class="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0 text-xs">
              <div class="flex-1 min-w-0">
                <span class="font-mono text-green-600">{{ p.itemCode }}</span>
                <span class="text-stone-500 ml-2 truncate">{{ p.description }}</span>
              </div>
              <div class="text-right">
                <span class="text-stone-500">RM {{ p.oldPrice.toFixed(2) }} → </span>
                <span class="font-semibold">RM {{ p.newPrice.toFixed(2) }}</span>
                <span class="ml-2" :class="p.deltaPct > 0 ? 'text-red-500' : 'text-green-600'">
                  {{ p.deltaPct > 0 ? '+' : '' }}{{ p.deltaPct }}%
                </span>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Recent Invoices -->
      <BaseCard title="Recent Invoices">
        <template #header-action>
          <RouterLink to="/app/documents?type=INVOICE" class="text-green-600 text-xs hover:text-green-500">View all</RouterLink>
        </template>
        <div v-if="!dashboard.recentInvoices.length" class="text-stone-500 text-sm py-4 text-center">No invoices yet.</div>
        <div v-else class="space-y-2 max-h-64 overflow-y-auto">
          <RouterLink
            v-for="inv in dashboard.recentInvoices"
            :key="inv.id"
            :to="`/app/documents/${inv.id}`"
            class="flex items-center justify-between py-2 border-b border-stone-200 last:border-0 hover:bg-stone-200/30 -mx-2 px-2 rounded transition-colors"
          >
            <div>
              <span class="font-mono text-green-600 text-sm">{{ inv.documentNumber }}</span>
              <span class="text-stone-500 text-xs ml-2">{{ fmtDate(inv.issueDate) }}</span>
              <span v-if="inv.customerName" class="text-stone-500 text-xs ml-2">— {{ inv.customerName }}</span>
            </div>
            <div class="flex items-center gap-3">
              <BaseBadge :color="statusColor(inv.status)">{{ inv.status }}</BaseBadge>
              <span class="text-stone-700 text-sm font-medium">RM {{ Number(inv.totalAmount).toFixed(2) }}</span>
            </div>
          </RouterLink>
        </div>
      </BaseCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useDashboardStore } from '../../stores/dashboard'
import BaseCard from '../../components/base/BaseCard.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import { Plus, Monitor, AlertTriangle } from 'lucide-vue-next'
import { useProductionStore } from '../../stores/production'
import type { ProductionAlert } from '../../types'
import { ref, onUnmounted } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Filler,
  Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Filler, Title, Tooltip, Legend)

const dashboard = useDashboardStore()

// ─── Stat Card Component ───────────────────────────────────
const StatCard = {
  props: ['label', 'value', 'icon', 'color', 'alert'],
  template: `
    <div :class="['bg-white border rounded-xl p-5', alert ? 'border-red-800/50' : 'border-stone-200']">
      <p class="text-2xl font-bold text-stone-900">{{ value }}</p>
      <p class="text-xs text-stone-500 mt-1">{{ label }}</p>
    </div>
  `,
}

// ─── Charts ────────────────────────────────────────────────
const revenueChartData = computed(() => {
  if (!dashboard.revenueChart.length) return null
  return {
    labels: dashboard.revenueChart.map((d) => {
      const date = new Date(d.date)
      return date.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric' })
    }),
    datasets: [{
      label: 'Revenue (RM)',
      data: dashboard.revenueChart.map((d) => d.revenue),
      backgroundColor: 'rgba(255, 215, 0, 0.3)',
      borderColor: 'rgba(255, 215, 0, 0.8)',
      borderWidth: 2,
      borderRadius: 6,
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111217',
      borderColor: '#2e303a',
      borderWidth: 1,
      titleColor: '#FFD700',
      bodyColor: '#e1e2e5',
      callbacks: {
        label: (ctx: any) => `RM ${ctx.raw.toFixed(2)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(46, 48, 58, 0.5)' },
      ticks: { color: '#6b6e7a', font: { size: 11 } },
    },
    y: {
      grid: { color: 'rgba(46, 48, 58, 0.5)' },
      ticks: {
        color: '#6b6e7a',
        font: { size: 11 },
        callback: (v: any) => `RM ${v}`,
      },
      beginAtZero: true,
    },
  },
}

const docChartData = computed(() => {
  const breakdown = dashboard.stats?.documentBreakdown
  if (!breakdown || Object.keys(breakdown).length === 0) return null
  const labels: Record<string, string> = {
    QUOTATION: 'Quotations',
    INVOICE: 'Invoices',
    RECEIPT: 'Receipts',
    DELIVERY_ORDER: 'Delivery Orders',
  }
  const colors: Record<string, string> = {
    QUOTATION: '#3b82f6',
    INVOICE: '#FFD700',
    RECEIPT: '#22c55e',
    DELIVERY_ORDER: '#a855f7',
  }
  const keys = Object.keys(breakdown)
  return {
    labels: keys.map((k) => labels[k] || k),
    datasets: [{
      data: keys.map((k) => breakdown[k]),
      backgroundColor: keys.map((k) => colors[k] || '#6b6e7a'),
      borderWidth: 0,
    }],
  }
})

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: '#a4a7b0', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 },
    },
    tooltip: {
      backgroundColor: '#111217',
      borderColor: '#2e303a',
      borderWidth: 1,
      titleColor: '#FFD700',
      bodyColor: '#e1e2e5',
    },
  },
}

// ─── Phase 6 Charts ────────────────────────────────────────
const dailySalesChartData = computed(() => {
  const ds = dashboard.stats?.dailySales
  if (!ds || !ds.length) return null
  return {
    labels: ds.map((d) => new Date(d.date).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })),
    datasets: [{
      label: 'Sales (RM)',
      data: ds.map((d) => d.total),
      borderColor: '#495c14',
      backgroundColor: 'rgba(134, 153, 64, 0.25)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
    }],
  }
})

const topSellingChartData = computed(() => {
  const ts = dashboard.stats?.topSellingItems
  if (!ts || !ts.length) return null
  return {
    labels: ts.map((t) => t.itemName.slice(0, 20)),
    datasets: [{
      label: 'Qty',
      data: ts.map((t) => t.totalQty),
      backgroundColor: ['#869940', '#495c14', '#a3b568', '#6b7a3d', '#c1cf93'],
      borderRadius: 4,
    }],
  }
})

const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#6b6e7a', font: { size: 10 } } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#6b6e7a', font: { size: 10 }, callback: (v: any) => `RM ${v}` }, beginAtZero: true },
  },
}

const horizontalBarOptions = {
  indexAxis: 'y' as const,
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#6b6e7a', font: { size: 10 } }, beginAtZero: true },
    y: { grid: { display: false }, ticks: { color: '#6b6e7a', font: { size: 10 } } },
  },
}

const deliveryProgress = computed(() => {
  const d = dashboard.stats?.todaysDeliveries
  if (!d || d.total === 0) return 0
  return d.delivered / d.total
})

function statusBadgeColor(status: string): 'green' | 'blue' | 'gold' | 'red' | 'gray' {
  if (['DELIVERED'].includes(status)) return 'green'
  if (['READY', 'OUT_FOR_DELIVERY'].includes(status)) return 'blue'
  if (['PICKING', 'CUTTING', 'PACKING', 'CONFIRMED'].includes(status)) return 'gold'
  if (['CANCELLED'].includes(status)) return 'red'
  return 'gray'
}

// ─── Helpers ───────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-MY')
}

function statusColor(status: string) {
  if (status === 'PAID') return 'green' as const
  if (status === 'VOID' || status === 'OVERDUE') return 'red' as const
  if (status === 'OUTSTANDING' || status === 'PARTIAL') return 'gold' as const
  return 'gray' as const
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const productionStore = useProductionStore()
const productionAlerts = ref<ProductionAlert[]>([])
let alertsPoller: any = null

async function refreshAlerts() {
  try { productionAlerts.value = await productionStore.fetchAlerts() } catch { /* noop */ }
}

onMounted(() => {
  dashboard.fetchAll()
  refreshAlerts()
  alertsPoller = setInterval(refreshAlerts, 60000)
})
onUnmounted(() => { if (alertsPoller) clearInterval(alertsPoller) })
</script>
