import { defineStore } from 'pinia'
import { ref } from 'vue'
import shopApi from '../lib/shop-api'
import type { ShopCategory, ShopProduct, ShopOrder, CutoffInfo } from '../types'

interface ShopCustomer {
  id: string
  name: string
  phone: string
  email?: string | null
  orders?: ShopOrder[]
}

export const useShopStore = defineStore('shop', () => {
  const categories = ref<ShopCategory[]>([])
  const products = ref<ShopProduct[]>([])
  const currentProduct = ref<ShopProduct | null>(null)
  const cutoff = ref<CutoffInfo | null>(null)
  const loading = ref(false)
  const customer = ref<ShopCustomer | null>(null)
  const shopToken = ref<string | null>(localStorage.getItem('hg_shop_token'))

  async function fetchCategories() {
    const { data } = await shopApi.get('/categories')
    categories.value = data.data
    return data.data as ShopCategory[]
  }

  async function fetchProducts(params: { categoryId?: string; search?: string } = {}) {
    loading.value = true
    try {
      const { data } = await shopApi.get('/products', { params })
      products.value = data.data
      return data.data as ShopProduct[]
    } finally { loading.value = false }
  }

  async function fetchProduct(id: string) {
    const { data } = await shopApi.get(`/products/${id}`)
    currentProduct.value = data.data
    return data.data as ShopProduct
  }

  async function fetchCutoff() {
    const { data } = await shopApi.get('/cutoff')
    cutoff.value = data.data
    return data.data as CutoffInfo
  }

  async function placeOrder(payload: any) {
    const { data } = await shopApi.post('/orders', payload)
    return data.data as { orderId: string; orderNumber: string; total: number; deliveryDate: string; deliverySlot: string; status: string }
  }

  async function trackOrder(orderNumber: string, phone: string) {
    const { data } = await shopApi.get(`/orders/${orderNumber}`, { params: { phone } })
    return data.data as ShopOrder
  }

  async function fetchOrderInvoice(orderNumber: string, phone: string) {
    const { data } = await shopApi.get(`/orders/${orderNumber}/invoice`, { params: { phone } })
    return data.data
  }

  async function login(phone: string, password: string) {
    const { data } = await shopApi.post('/customers/login', { phone, password })
    shopToken.value = data.data.token
    customer.value = data.data.customer
    localStorage.setItem('hg_shop_token', data.data.token)
    return customer.value
  }

  async function fetchMe() {
    const { data } = await shopApi.get('/customers/me')
    customer.value = data.data
    return data.data as ShopCustomer
  }

  function logout() {
    shopToken.value = null
    customer.value = null
    localStorage.removeItem('hg_shop_token')
  }

  return {
    categories, products, currentProduct, cutoff, loading, customer, shopToken,
    fetchCategories, fetchProducts, fetchProduct, fetchCutoff,
    placeOrder, trackOrder, fetchOrderInvoice, login, fetchMe, logout,
  }
})
