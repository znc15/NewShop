import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminInfo } from '@/types/admin'

interface AdminAuthState {
  admin: AdminInfo | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAdmin: (admin: AdminInfo | null) => void
  setToken: (token: string | null) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      setAdmin: (admin) =>
        set({
          admin,
          isAuthenticated: !!admin,
        }),
      setToken: (token) => set({ token }),
      logout: () =>
        set({
          admin: null,
          token: null,
          isAuthenticated: false,
        }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)