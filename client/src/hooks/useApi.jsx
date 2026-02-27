import { createContext, useContext, useMemo } from 'react'
import axios from 'axios'

const ApiContext = createContext(null)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

export function ApiProvider({ token, children }) {
  const value = useMemo(() => {
    const instance = axios.create({
      baseURL: `${API_BASE_URL}/api`,
    })

    instance.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    return { api: instance }
  }, [token])

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
}

export function useApi() {
  const ctx = useContext(ApiContext)
  if (!ctx) {
    throw new Error('useApi must be used within ApiProvider')
  }
  return ctx.api
}

