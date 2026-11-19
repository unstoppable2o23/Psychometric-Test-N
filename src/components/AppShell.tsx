'use client'
import { useApp } from '@/lib/store'
import { AuthView } from '@/components/views/AuthView'
import { StudentDashboard } from '@/components/views/StudentDashboard'
import { TestRunner } from '@/components/views/TestRunner'
import { AdminDashboard } from '@/components/views/AdminDashboard'
import { CounsellorDashboard } from '@/components/views/CounsellorDashboard'
import { ReportView } from '@/components/views/ReportView'
import { Brain, LogOut, ShieldCheck, GraduationCap, Stethoscope } from 'lucide-react'
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog'

export function AppShell() {
  const user = useApp((s) => s.user)
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const logout = useApp((s) => s.logout)

  const roleIcon = user?.role === 'SUPER_ADMIN' ? ShieldCheck : user?.role === 'COUNSELLOR' ? Stethoscope : GraduationCap
  const RoleIcon = roleIcon

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => setView(user ? (user.role === 'STUDENT' ? 'student-dashboard' : user.role === 'SUPER_ADMIN' ? 'admin-dashboard' : 'counsellor-dashboard') : 'landing')} className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white grid place-items-center shadow-sm group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5" />
            </span>
            <span className="font-bold text-slate-900 text-base hidden sm:block">Psychometric<span className="text-teal-600"> Platform</span></span>
          </button>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100">
                <RoleIcon className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-semibold text-slate-700">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{user.role.replace('_', ' ')}</span>
              </div>
              <ChangePasswordDialog />
              <button onClick={logout} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          ) : view === 'test-runner' ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              <span className="hidden sm:inline">Secure Assessment</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setView('login')} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">Sign in</button>
              <button onClick={() => setView('register')} className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors">Register</button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full">
        {!user && (view === 'landing' || view === 'login' || view === 'register') && <AuthView />}
        {user?.role === 'STUDENT' && view === 'student-dashboard' && <StudentDashboard />}
        {view === 'test-runner' && <TestRunner />}
        {view === 'report-view' && <ReportView />}
        {user?.role === 'SUPER_ADMIN' && view === 'admin-dashboard' && <AdminDashboard />}
        {user?.role === 'COUNSELLOR' && view === 'counsellor-dashboard' && <CounsellorDashboard />}
      </main>

      {/* Sticky footer */}
      <footer className="mt-auto bg-slate-900 text-slate-300 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p className="text-slate-400">Psychometric Testing Platform &middot; Secure server-side assessment &amp; scoring</p>
          <p className="text-slate-500">Confidential &middot; Authorised access only</p>
        </div>
      </footer>
    </div>
  )
}
