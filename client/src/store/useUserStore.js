import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      unreadCount: 0,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setUnreadCount: (count) => set({ unreadCount: count }),

      login: (user, token) => {
        set({ user, token })
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      },

      logout: () => {
        set({ user: null, token: null, unreadCount: 0 })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      },

      updateUser: (data) => {
        const current = get().user
        set({ user: { ...current, ...data } })
      }
    }),
    {
      name: 'user-storage'
    }
  )
)

export default useUserStore
