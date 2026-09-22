import axios from 'axios'

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`
  }
  return 'http://localhost:8000'
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Authorization header and dynamic host matching baseURL
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl()
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cm_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

export default api