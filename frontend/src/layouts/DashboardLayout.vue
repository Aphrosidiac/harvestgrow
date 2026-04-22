<template>
  <div class="flex h-screen bg-stone-50">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/50 z-40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-200 flex flex-col transform transition-transform lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
    >
      <!-- Logo -->
      <div class="py-6 px-5 border-b border-stone-200">
        <RouterLink to="/app/dashboard" class="flex justify-center" @click="sidebarOpen = false">
          <img src="/logo-sidebar.png" alt="HarvestGrow" class="h-20" />
        </RouterLink>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <template v-for="item in navItems" :key="item.path || item.label">
          <!-- Group with children -->
          <div v-if="item.children">
            <button
              @click="toggleGroup(item)"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              :class="isGroupOpen(item) ? 'text-stone-900 bg-stone-200' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'"
            >
              <component :is="item.icon" class="w-5 h-5" />
              <span class="flex-1 text-left">{{ item.label }}</span>
              <ChevronDown class="w-4 h-4 transition-transform" :class="isGroupOpen(item) ? 'rotate-180' : ''" />
            </button>
            <div v-if="isGroupOpen(item)" class="ml-7 mt-1 space-y-0.5">
              <RouterLink
                v-for="child in item.children"
                :key="child.path"
                :to="child.path"
                @click="sidebarOpen = false"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                :class="isActive(child.path) ? 'bg-green-600/10 text-green-600 font-medium' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'"
              >
                <span class="flex-1">{{ child.label }}</span>
              </RouterLink>
            </div>
          </div>
          <!-- Leaf item -->
          <RouterLink
            v-else
            :to="item.path"
            @click="sidebarOpen = false"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.path) ? 'bg-green-600/10 text-green-600' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'"
          >
            <component :is="item.icon" class="w-5 h-5" />
            <span class="flex-1">{{ item.label }}</span>
          </RouterLink>
        </template>
      </nav>

      <!-- User -->
      <div class="p-4 border-t border-stone-200">
        <div class="flex items-center gap-3">
          <RouterLink to="/app/profile" @click="sidebarOpen = false" class="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center hover:bg-green-600/30 transition-colors">
            <span class="text-green-600 text-xs font-bold">{{ userInitials }}</span>
          </RouterLink>
          <RouterLink to="/app/profile" @click="sidebarOpen = false" class="flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <p class="text-sm font-medium text-stone-900 truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-stone-500 truncate">{{ auth.user?.email }}</p>
          </RouterLink>
          <button @click="handleLogout" class="text-stone-500 hover:text-red-400 transition-colors">
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top bar -->
      <header class="h-14 border-b border-stone-200 bg-white/50 backdrop-blur-sm flex items-center px-6 gap-4">
        <button @click="sidebarOpen = true" class="lg:hidden text-stone-500 hover:text-stone-700">
          <Menu class="w-5 h-5" />
        </button>
        <h1 class="text-lg font-semibold text-stone-900">{{ pageTitle }}</h1>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
    <AssistantWidget />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { Package, Users, BarChart3, LogOut, Menu, TrendingUp, ShoppingCart, PackageCheck, ChevronDown, FileSearch, MessageCircle, Send, ScrollText } from 'lucide-vue-next'
import AssistantWidget from '../components/AssistantWidget.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)

const allNavItems = [
  { path: '/app/users/office', label: 'User (Office Use)', icon: Users, roles: ['ADMIN'] },
  { path: '/app/sales-order', label: 'Sales Order', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER'] },
  {
    label: 'Master Data', icon: Package, roles: ['ADMIN', 'MANAGER'],
    children: [
      { path: '/app/master/customer', label: 'Customer' },
      { path: '/app/master/customer-group', label: 'Customer Group' },
      { path: '/app/master/product', label: 'Product' },
      { path: '/app/master/quotation', label: 'Quotation' },
      { path: '/app/master/packing-list', label: 'Packing List' },
      { path: '/app/master/supplier-list', label: 'Supplier List' },
    ],
  },
  { path: '/app/whatsapp-agents', label: 'WhatsApp Agents', icon: MessageCircle, roles: ['ADMIN'] },
  { path: '/app/whatsapp-settings', label: 'WhatsApp Settings', icon: MessageCircle, roles: ['ADMIN'] },
  { path: '/app/quotation-broadcast', label: 'Quotation Broadcast', icon: Send, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/quotation-compare', label: 'Quotation Compare', icon: FileSearch, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/product-clearance', label: 'Product Clearance', icon: PackageCheck, roles: ['ADMIN', 'MANAGER'] },
  {
    label: 'Product Pricing', icon: TrendingUp, roles: ['ADMIN', 'MANAGER'],
    children: [
      { path: '/app/pricing/new', label: 'Pricing List New' },
      { path: '/app/pricing/edit-board', label: 'Pricing Edit Board' },
    ],
  },
  {
    label: 'Report', icon: BarChart3, roles: ['ADMIN', 'MANAGER'],
    children: [
      { path: '/app/reports/truck', label: 'Truck' },
      { path: '/app/reports/export-import', label: 'Export / Import' },
      { path: '/app/reports/packing-list-summary', label: 'Packing List Summary' },
      { path: '/app/reports/wastage-summary', label: 'Wastage Summary' },
      { path: '/app/reports/supply-return-summary', label: 'Supply Return Summary' },
      { path: '/app/reports/supplier-summary', label: 'Supplier Summary' },
      { path: '/app/reports/low-margin-summary', label: 'Low Margin Summary' },
      { path: '/app/reports/truck-map', label: 'Truck Map' },
      { path: '/app/reports/truck-road', label: 'Truck Road' },
    ],
  },
  { path: '/app/audit', label: 'Audit Log', icon: ScrollText, roles: ['ADMIN'] },
]

const navItems = computed(() =>
  allNavItems.filter((item) => item.roles.includes(auth.user?.role || 'WORKER'))
)

const openGroups = ref<Record<string, boolean>>({})
function isGroupActive(item: any) {
  if (!item.children) return false
  return item.children.some((c: any) => route.path.startsWith(c.path))
}
function isGroupOpen(item: any) {
  const override = openGroups.value[item.label]
  if (override !== undefined) return override
  return isGroupActive(item)
}
function toggleGroup(item: any) {
  openGroups.value[item.label] = !isGroupOpen(item)
}

const isActive = (path: string) => route.path.startsWith(path)

const pageTitle = computed(() => {
  const name = route.name as string
  if (name?.startsWith('stock')) return 'Stock Management'
  if (name?.startsWith('user-office')) return 'User (Office)'
  if (name?.startsWith('sales-order')) return 'Sales Order'
  if (name === 'master-customer') return 'Customer'
  if (name === 'master-customer-group') return 'Customer Group'
  if (name === 'master-product') return 'Product'
  if (name === 'master-quotation') return 'Quotation Management'
  if (name === 'master-packing-list') return 'Packing List Management'
  if (name === 'master-supplier-list') return 'Supplier Management'
  if (name === 'whatsapp-agents') return 'WhatsApp AI Agents'
  if (name === 'whatsapp-settings') return 'WhatsApp Settings'
  if (name === 'quotation-broadcast') return 'Quotation Broadcast'
  if (name === 'quotation-compare') return 'Quotation Compare'
  if (name === 'product-clearance') return 'Product Clearance'
  if (name === 'report-truck') return 'Truck Management'
  if (name === 'report-export-import') return 'Export / Import Management'
  if (name === 'report-packing-list-summary') return 'Packing List Summary'
  if (name === 'report-wastage-summary') return 'Wastage Summary'
  if (name === 'report-supply-return-summary') return 'Supply Return Summary'
  if (name === 'report-supplier-summary') return 'Supplier Summary'
  if (name === 'report-low-margin-summary') return 'Low Margin Summary'
  if (name === 'report-truck-map') return 'Truck Map'
  if (name === 'report-truck-road') return 'Truck Map Setting'
  if (name === 'pricing-new') return 'Pricing List New'
  if (name === 'pricing-edit-board') return 'Pricing Edit Board'
  if (name?.startsWith('staff')) return 'Staff Management'
  if (name?.startsWith('customer')) return 'Customers'
  if (name?.startsWith('document')) return 'Documents'
  if (name?.startsWith('supplier-payment')) return 'A/P Payments'
  if (name?.startsWith('supplier')) return 'Suppliers'
  if (name?.startsWith('purchase-invoice')) return 'Purchase Invoices'
  if (name === 'take-order') return 'Take Order'
  if (name === 'dashboard') return 'Dashboard'
  if (name?.startsWith('debtor')) return 'Debtors'
  if (name === 'payment-log') return 'Payment Log'
  if (name === 'profile') return 'Profile'
  if (name === 'audit-list') return 'Audit Log'
  return 'HarvestGrow'
})

const userInitials = computed(() => {
  const name = auth.user?.name || ''
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
})

async function handleLogout() {
  auth.logout()
  router.push('/admin/login')
}
</script>
