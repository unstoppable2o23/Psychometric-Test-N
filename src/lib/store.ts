'use client'
import { create } from 'zustand'
import { api, AuthUser, Role } from '@/lib/api-client'

export type View =
  | 'landing' | 'login' | 'register'
  | 'student-dashboard' | 'test-runner' | 'report-view'
  | 'admin-dashboard' | 'counsellor-dashboard'

interface AppState {
  user: AuthUser | null
  loading: boolean
  view: View
  testToken: string | null
  reportId: string | null
  // actions
  init: () => Promise<void>
  setView: (v: View) => void
  setUser: (u: AuthUser | null) => void
  startTest: (token: string) => void
  viewReport: (id: string) => void
  logout: () => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  loading: true,
  view: 'landing',
  testToken: null,
  reportId: null,
  init: async () => {
    // If the page is opened via a unique test link (/?test=TOKEN), show the
    // test runner directly. Still try to load the user in the background so
    // the header shows correctly if they're logged in.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const testToken = params.get('test')
      if (testToken) {
        set({ testToken, view: 'test-runner', loading: false })
        // Try to load user in background (non-blocking)
        try {
          const { user } = await api.me()
          if (user) set({ user })
        } catch {}
        return
      }
    }
    try {
      const { user } = await api.me()
      if (user) {
        set({ user, loading: false, view: defaultViewFor(user.role) })
      } else {
        set({ user: null, loading: false, view: 'landing' })
      }
    } catch {
      set({ loading: false, view: 'landing' })
    }
  },
  setView: (v) => set({ view: v }),
  setUser: (u) => set({ user: u, view: u ? defaultViewFor(u.role) : 'landing' }),
  startTest: (token) => set({ testToken: token, view: 'test-runner' }),
  viewReport: (id) => set({ reportId: id, view: 'report-view' }),
  logout: async () => {
    try { await api.logout() } catch {}
    set({ user: null, view: 'landing', testToken: null, reportId: null })
  },
}))

function defaultViewFor(role: Role): View {
  if (role === 'STUDENT') return 'student-dashboard'
  if (role === 'SUPER_ADMIN') return 'admin-dashboard'
  if (role === 'COUNSELLOR') return 'counsellor-dashboard'
  return 'landing'
}
