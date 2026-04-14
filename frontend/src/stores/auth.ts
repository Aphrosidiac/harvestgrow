import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../lib/api'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('dg_token'))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isManager = computed(() => user.value?.role === 'MANAGER')
  // HarvestGrow has no WORKER role; treat PRODUCTION + PACKER as worker-equivalent for permission gating
  const isWorker = computed(() => user.value?.role === 'PRODUCTION' || user.value?.role === 'PACKER')
  const canManageStaff = computed(() => user.value?.role === 'ADMIN')
  const canAccessFullApp = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'MANAGER')

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    token.value = data.data.token
    user.value = data.data.user
    localStorage.setItem('dg_token', data.data.token)
  }

  async function fetchProfile() {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.data
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('dg_token')
  }

  return { user, token, isAuthenticated, isAdmin, isManager, isWorker, canManageStaff, canAccessFullApp, login, fetchProfile, logout }
})
