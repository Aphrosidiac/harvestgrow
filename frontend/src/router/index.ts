import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  },
  routes: [
    // ─── Public storefront ────────────────────────────────
    {
      path: '/',
      component: () => import('../layouts/ShopLayout.vue'),
      children: [
        { path: '', name: 'shop-home', component: () => import('../pages/shop/HomePage.vue') },
        { path: 'shop', name: 'shop-catalog', component: () => import('../pages/shop/CatalogPage.vue') },
        { path: 'shop/category/:slug', name: 'shop-category', component: () => import('../pages/shop/CatalogPage.vue') },
        { path: 'shop/product/:id', name: 'shop-product', component: () => import('../pages/shop/ProductDetailPage.vue') },
        { path: 'cart', name: 'shop-cart', component: () => import('../pages/shop/CartPage.vue') },
        { path: 'quick-order', name: 'shop-quick-order', component: () => import('../pages/shop/QuickOrderPage.vue') },
        { path: 'checkout', name: 'shop-checkout', component: () => import('../pages/shop/CheckoutPage.vue') },
        { path: 'order/:orderNumber', name: 'shop-order-confirm', component: () => import('../pages/shop/OrderConfirmationPage.vue') },
        { path: 'track', name: 'shop-track', component: () => import('../pages/shop/TrackOrderPage.vue') },
        { path: 'account/login', name: 'shop-login', component: () => import('../pages/shop/ShopLoginPage.vue') },
        { path: 'account', name: 'shop-account', component: () => import('../pages/shop/AccountPage.vue') },
      ],
    },

    // ─── Admin login ──────────────────────────────────────
    {
      path: '/admin/login',
      name: 'login',
      component: () => import('../pages/auth/LoginPage.vue'),
    },

    // ─── Admin App (auth-guarded) ─────────────────────────
    {
      path: '/app',
      component: () => import('../layouts/DashboardLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'app-root', redirect: '/app/dashboard' },
        { path: 'dashboard', name: 'dashboard', component: () => import('../pages/dashboard/DashboardPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'orders', name: 'order-list', component: () => import('../pages/orders/OrderListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER'] } },
        { path: 'orders/:id', name: 'order-detail', component: () => import('../pages/orders/OrderDetailPage.vue'), meta: { roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'PACKER'] } },
        { path: 'stock', name: 'stock-list', component: () => import('../pages/stock/StockListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'stock/daily-pricing', name: 'stock-daily-pricing', component: () => import('../pages/stock/DailyPricingPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'stock/low-stock', name: 'stock-low-stock', component: () => import('../pages/stock/LowStockPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'stock/new', name: 'stock-create', component: () => import('../pages/stock/StockCreatePage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'stock/:id/edit', name: 'stock-edit', component: () => import('../pages/stock/StockEditPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'stock/:id/history', name: 'stock-history', component: () => import('../pages/stock/StockHistoryPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'users/office', name: 'user-office', component: () => import('../pages/users/UserOfficePage.vue'), meta: { roles: ['ADMIN'] } },
        { path: 'sales-order', name: 'sales-order-list', component: () => import('../pages/sales-orders/SalesOrderListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'sales-order/new', name: 'sales-order-create', component: () => import('../pages/sales-orders/SalesOrderFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'sales-order/:id/edit', name: 'sales-order-edit', component: () => import('../pages/sales-orders/SalesOrderFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'sales-order/:id/view', name: 'sales-order-view', component: () => import('../pages/sales-orders/SalesOrderViewPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'master/customer', name: 'master-customer', component: () => import('../pages/master-data/MasterCustomerPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'master/customer-group', name: 'master-customer-group', component: () => import('../pages/master-data/MasterCustomerGroupPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'master/product', name: 'master-product', component: () => import('../pages/master-data/MasterProductPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'master/quotation', name: 'master-quotation', component: () => import('../pages/master-data/MasterQuotationPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'master/packing-list', name: 'master-packing-list', component: () => import('../pages/master-data/MasterPackingListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'master/supplier-list', name: 'master-supplier-list', component: () => import('../pages/master-data/MasterSupplierPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'whatsapp-agents', name: 'whatsapp-agents', component: () => import('../pages/whatsapp/WhatsAppAgentsPage.vue'), meta: { roles: ['ADMIN'] } },
        { path: 'whatsapp-settings', name: 'whatsapp-settings', component: () => import('../pages/whatsapp/WhatsAppSettingsPage.vue'), meta: { roles: ['ADMIN'] } },
        { path: 'quotation-broadcast', name: 'quotation-broadcast', component: () => import('../pages/quotation-broadcast/QuotationBroadcastPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'quotation-compare', name: 'quotation-compare', component: () => import('../pages/quotation-compare/QuotationComparePage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'product-clearance', name: 'product-clearance', component: () => import('../pages/product-clearance/ProductClearancePage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'pricing/new', name: 'pricing-new', component: () => import('../pages/pricing/PricingListNewPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'pricing/edit-board', name: 'pricing-edit-board', component: () => import('../pages/pricing/PricingEditBoardPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/truck', name: 'report-truck', component: () => import('../pages/reports/ReportTruckPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/export-import', name: 'report-export-import', component: () => import('../pages/reports/ReportExportImportPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/packing-list-summary', name: 'report-packing-list-summary', component: () => import('../pages/reports/ReportPackingListSummaryPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/wastage-summary', name: 'report-wastage-summary', component: () => import('../pages/reports/ReportWastageSummaryPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/supply-return-summary', name: 'report-supply-return-summary', component: () => import('../pages/reports/ReportSupplyReturnSummaryPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/supplier-summary', name: 'report-supplier-summary', component: () => import('../pages/reports/ReportSupplierSummaryPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/low-margin-summary', name: 'report-low-margin-summary', component: () => import('../pages/reports/ReportLowMarginSummaryPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/truck-map', name: 'report-truck-map', component: () => import('../pages/reports/ReportTruckMapPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/truck-road', name: 'report-truck-road', component: () => import('../pages/reports/ReportTruckRoadPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'staff', name: 'staff-list', component: () => import('../pages/staff/StaffListPage.vue'), meta: { roles: ['ADMIN'] } },
        { path: 'audit', name: 'audit-list', component: () => import('../pages/audit/AuditLogPage.vue'), meta: { roles: ['ADMIN'] } },
        { path: 'customers', name: 'customer-list', component: () => import('../pages/customers/CustomerListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'customers/new', name: 'customer-create', component: () => import('../pages/customers/CustomerFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'customers/:id/edit', name: 'customer-edit', component: () => import('../pages/customers/CustomerFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'take-order', name: 'take-order', component: () => import('../pages/documents/TakeOrderPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'documents', name: 'document-list', component: () => import('../pages/documents/DocumentListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'documents/new', name: 'document-create', component: () => import('../pages/documents/DocumentFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'documents/settings', name: 'document-settings', component: () => import('../pages/documents/DocumentSettingsPage.vue'), meta: { roles: ['ADMIN'] } },
        { path: 'documents/:id', name: 'document-view', component: () => import('../pages/documents/DocumentViewPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'documents/:id/edit', name: 'document-edit', component: () => import('../pages/documents/DocumentFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'debtors', name: 'debtor-list', component: () => import('../pages/debtors/DebtorListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'debtors/:id', name: 'debtor-detail', component: () => import('../pages/debtors/DebtorDetailPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'suppliers', name: 'supplier-list', component: () => import('../pages/suppliers/SupplierListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'suppliers/new', name: 'supplier-create', component: () => import('../pages/suppliers/SupplierFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'suppliers/:id/edit', name: 'supplier-edit', component: () => import('../pages/suppliers/SupplierFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'purchase-invoices', name: 'purchase-invoice-list', component: () => import('../pages/purchase-invoices/PurchaseInvoiceListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'purchase-invoices/new', name: 'purchase-invoice-create', component: () => import('../pages/purchase-invoices/PurchaseInvoiceFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'purchase-invoices/:id', name: 'purchase-invoice-view', component: () => import('../pages/purchase-invoices/PurchaseInvoiceViewPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'purchase-invoices/:id/edit', name: 'purchase-invoice-edit', component: () => import('../pages/purchase-invoices/PurchaseInvoiceFormPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'supplier-payments', name: 'supplier-payment-list', component: () => import('../pages/supplier-payments/SupplierPaymentListPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/payment-log', name: 'payment-log', component: () => import('../pages/reports/PaymentLogPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/sales', name: 'sales-report', component: () => import('../pages/reports/SalesReportPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/orders', name: 'orders-report', component: () => import('../pages/reports/OrdersReportPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/stock-movement', name: 'stock-movement-report', component: () => import('../pages/reports/StockMovementReportPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/price-history', name: 'price-history-report', component: () => import('../pages/reports/PriceHistoryReportPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'reports/drivers', name: 'drivers-report', component: () => import('../pages/reports/DriverPerformancePage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'profile', name: 'profile', component: () => import('../pages/profile/ProfilePage.vue') },
        { path: 'production/board', name: 'production-board', component: () => import('../pages/production/ProductionBoardPage.vue'), meta: { roles: ['ADMIN', 'MANAGER', 'PRODUCTION'] } },
        { path: 'production/packaging', name: 'production-packaging', component: () => import('../pages/production/PackagingPage.vue'), meta: { roles: ['ADMIN', 'MANAGER', 'PACKER', 'PRODUCTION'] } },
        { path: 'delivery/dispatch', name: 'delivery-dispatch', component: () => import('../pages/delivery/DispatchPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
        { path: 'delivery/drivers', name: 'delivery-drivers', component: () => import('../pages/delivery/DriverManagePage.vue'), meta: { roles: ['ADMIN'] } },
        { path: 'delivery/trips/:id', name: 'delivery-trip-detail', component: () => import('../pages/delivery/TripDetailPage.vue'), meta: { roles: ['ADMIN', 'MANAGER'] } },
      ],
    },
    // ─── Driver mobile layout ─────────────────────────────
    {
      path: '/driver',
      component: () => import('../layouts/DriverLayout.vue'),
      meta: { requiresAuth: true, roles: ['DRIVER'] },
      children: [
        { path: '', name: 'driver-home', component: () => import('../pages/driver/DriverHomePage.vue'), meta: { roles: ['DRIVER'] } },
        { path: 'trip/:id', name: 'driver-trip', component: () => import('../pages/driver/TripRunPage.vue'), meta: { roles: ['DRIVER'] } },
      ],
    },
    {
      path: '/app/production/orders/:id/pack-sheet/print',
      name: 'pack-sheet-print',
      component: () => import('../pages/production/PackSheetPrintPage.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN', 'MANAGER', 'PACKER', 'PRODUCTION'] },
    },
    // Shop Display — fullscreen, no layout wrapper
    {
      path: '/app/shop-display',
      name: 'shop-display',
      component: () => import('../pages/display/ShopDisplayPage.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// Auth guard — admin app only
router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()

  if (to.matched.some((r) => r.meta.requiresAuth)) {
    if (!auth.isAuthenticated) {
      return next('/admin/login')
    }
    if (!auth.user) {
      await auth.fetchProfile()
    }

    // DRIVER is restricted to /driver/*
    if (auth.user?.role === 'DRIVER' && to.path.startsWith('/app')) {
      return next('/driver')
    }

    const roles = to.meta.roles as string[] | undefined
    if (roles && auth.user && !roles.includes(auth.user.role)) {
      // Pick a landing route based on role
      const role = auth.user.role
      if (role === 'PACKER') return next('/app/production/packaging')
      if (role === 'PRODUCTION') return next('/app/production/board')
      if (role === 'DRIVER') return next('/driver')
      return next('/app/dashboard')
    }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    if (auth.user?.role === 'DRIVER') return next('/driver')
    return next('/app/dashboard')
  }

  next()
})

export default router
