'use client'
import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { AppShell } from '@/components/AppShell'

export default function Home() {
  const init = useApp((s) => s.init)
  const loading = useApp((s) => s.loading)
  useEffect(() => { init() }, [init])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading platform…</p>
        </div>
      </div>
    )
  }
  return <AppShell />
}
