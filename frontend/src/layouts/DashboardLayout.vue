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
            <span v-if="item.badgeKey === 'lowStock' && lowStockCount > 0" class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold">
              {{ lowStockCount }}
            </span>
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
import { LayoutDashboard, Package, Users, FileText, ClipboardList, AlertCircle, BarChart3, UserCog, LogOut, Menu, Truck, Wallet, CreditCard, ShieldCheck, TrendingUp, AlertTriangle, ShoppingCart, KanbanSquare, PackageCheck, User as UserIcon, ChevronDown } from 'lucide-vue-next'
import AssistantWidget from '../components/AssistantWidget.vue'
import { useStockStore } from '../stores/stock'
import { onMounted } from 'vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const stockStore = useStockStore()
const lowStockCount = ref(0)

async function refreshLowStockCount() {
  try {
    const items = await stockStore.fetchLowStock()
    lowStockCount.value = items.length
  } catch {
    lowStockCount.value = 0
  }
}

onMounted(() => {
  if (auth.isAuthenticated) refreshLowStockCount()
})

const allNavItems = [
  { path: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'PRODUCTION'] },
  { path: '/app/take-order', label: 'Take Order', icon: ClipboardList, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/production/board', label: 'Production Board', icon: KanbanSquare, roles: ['ADMIN', 'MANAGER', 'PRODUCTION'] },
  { path: '/app/production/packaging', label: 'Packaging', icon: PackageCheck, roles: ['ADMIN', 'MANAGER', 'PACKER', 'PRODUCTION'] },
  { path: '/app/orders', label: 'Orders', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER'] },
  { path: '/app/delivery/dispatch', label: 'Dispatch', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/delivery/drivers', label: 'Drivers', icon: UserCog, roles: ['ADMIN'] },
  { path: '/app/stock', label: 'Stock', icon: Package, roles: ['ADMIN', 'MANAGER', 'PRODUCTION'] },
  { path: '/app/stock/daily-pricing', label: 'Daily Pricing', icon: TrendingUp, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/stock/low-stock', label: 'Low Stock', icon: AlertTriangle, roles: ['ADMIN', 'MANAGER', 'PRODUCTION'], badgeKey: 'lowStock' },
  { path: '/app/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/documents', label: 'Documents', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/debtors', label: 'Debtors', icon: AlertCircle, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/suppliers', label: 'Suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER'], section: 'Purchasing' },
  { path: '/app/purchase-invoices', label: 'Purchase Invoices', icon: Wallet, roles: ['ADMIN', 'MANAGER'] },
  { path: '/app/supplier-payments', label: 'A/P Payments', icon: CreditCard, roles: ['ADMIN', 'MANAGER'] },
  {
    label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'],
    children: [
      { path: '/app/reports/payment-log', label: 'Payment Log' },
      { path: '/app/reports/sales', label: 'Sales' },
      { path: '/app/reports/orders', label: 'Orders' },
      { path: '/app/reports/stock-movement', label: 'Stock Movement' },
      { path: '/app/reports/price-history', label: 'Price History' },
      { path: '/app/reports/drivers', label: 'Driver Performance' },
    ],
  },
  { path: '/app/staff', label: 'Staff', icon: UserCog, roles: ['ADMIN'] },
  { path: '/app/audit', label: 'Audit Logs', icon: ShieldCheck, roles: ['ADMIN'] },
  { path: '/app/profile', label: 'Profile', icon: UserIcon, roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER', 'DRIVER'] },
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
