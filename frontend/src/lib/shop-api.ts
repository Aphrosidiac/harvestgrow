import axios from 'axios'

const shopApi = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '/api/v1') + '/shop',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

shopApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('hg_shop_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default shopApi
