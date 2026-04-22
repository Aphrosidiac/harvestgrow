import axios from 'axios'
import router from '../router'

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

shopApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hg_shop_token')
      router.push('/account/login')
    }
    return Promise.reject(error)
  }
)

export default shopApi
