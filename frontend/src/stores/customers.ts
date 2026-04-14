import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'
import type { Customer, Vehicle, PaginatedResponse } from '../types'

export const useCustomerStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)
  const loading = ref(false)

  async function fetchCustomers(params: Record<string, any> = {}) {
    loading.value = true
    try {
      const { data } = await api.get<PaginatedResponse<Customer>>('/customers', {
        params: { page: page.value, limit: limit.value, ...params },
      })
      customers.value = data.data
      total.value = data.total
      totalPages.value = data.totalPages
    } finally {
      loading.value = false
    }
  }

  async function searchCustomers(q: string): Promise<Customer[]> {
    const { data } = await api.get('/customers/search', { params: { q } })
    return data.data
  }

  async function getCustomer(id: string): Promise<Customer> {
    const { data } = await api.get(`/customers/${id}`)
    return data.data
  }

  async function createCustomer(payload: { name: string; phone?: string; email?: string; vehicles?: { plate: string; model?: string; mileage?: string }[] }): Promise<Customer> {
    const { data } = await api.post('/customers', payload)
    return data.data
  }

  async function updateCustomer(id: string, payload: { name?: string; phone?: string; email?: string }): Promise<Customer> {
    const { data } = await api.put(`/customers/${id}`, payload)
    return data.data
  }

  async function deleteCustomer(id: string) {
    await api.delete(`/customers/${id}`)
  }

  async function addVehicle(customerId: string, payload: { plate: string; model?: string; mileage?: string; isDefault?: boolean }): Promise<Vehicle> {
    const { data } = await api.post(`/customers/${customerId}/vehicles`, payload)
    return data.data
  }

  async function updateVehicle(customerId: string, vehicleId: string, payload: Partial<Vehicle>): Promise<Vehicle> {
    const { data } = await api.put(`/customers/${customerId}/vehicles/${vehicleId}`, payload)
    return data.data
  }

  async function deleteVehicle(customerId: string, vehicleId: string) {
    await api.delete(`/customers/${customerId}/vehicles/${vehicleId}`)
  }

  return {
    customers, total, page, limit, totalPages, loading,
    fetchCustomers, searchCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
    addVehicle, updateVehicle, deleteVehicle,
  }
})
