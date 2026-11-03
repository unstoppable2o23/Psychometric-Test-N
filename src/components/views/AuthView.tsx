'use client'
import { useState } from 'react'
import { useApp } from '@/lib/store'
import { api, Role } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, GraduationCap, ShieldCheck, Stethoscope, Sparkles, Lock, FileText, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

export function AuthView() {
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  if (view === 'login' || view === 'register') return <AuthForm mode={view} />
  return <Landing onGetStarted={() => setView('register')} onSignIn={() => setView('login')} />
}

function Landing({ onGetStarted, onSignIn }: { onGetStarted: () => void; onSignIn: () => void }) {
  return (
    <div className="relative overflow-hidden">
      {/* decorative blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl" />
        <div className="absolute top-40 -right-24 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl" />
      </div>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-6">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-600">9 validated psychometric assessments &middot; secure scoring</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
          Discover your <span className="bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent">natural profile</span>
          <br />through engaging assessments
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          A secure psychometric testing platform with server-side scoring, professional A4 reports,
          and confidential counsellor interpretation manuals — built for students, administrators and counsellors.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" onClick={onGetStarted} className="bg-teal-600 hover:bg-teal-700 text-white px-7 h-12 text-base">
            Get started — register
          </Button>
          <Button size="lg" variant="outline" onClick={onSignIn} className="px-7 h-12 text-base">Sign in</Button>
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            { icon: GraduationCap, title: 'For Students', desc: 'Take engaging one-question-at-a-time assessments with progress rewards and instant completion celebrations.', color: 'text-teal-600 bg-teal-50' },
            { icon: ShieldCheck, title: 'For Administrators', desc: 'Manage students, assign tests via unique secure links, monitor progress, and access generated reports.', color: 'text-emerald-600 bg-emerald-50' },
            { icon: Stethoscope, title: 'For Counsellors', desc: 'Access authorised student reports and confidential interpretation manuals for every assessment.', color: 'text-amber-600 bg-amber-50' },
          ].map((f) => (
            <Card key={f.title} className="text-left border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className={`w-11 h-11 rounded-xl grid place-items-center mb-3 ${f.color}`}><f.icon className="w-6 h-6" /></div>
                <h3 className="font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { icon: Lock, title: 'Server-side scoring', desc: 'Answers & scoring keys never reach the browser' },
            { icon: FileText, title: 'A4 PDF reports', desc: 'Professional vector PDFs with charts' },
            { icon: BarChart3, title: '9 assessments', desc: '680+ questions preserved from source' },
          ].map((s) => (
            <div key={s.title} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/70 border border-slate-200">
              <s.icon className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <div className="text-left"><p className="text-sm font-semibold text-slate-800">{s.title}</p><p className="text-xs text-slate-500">{s.desc}</p></div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-xs text-slate-400">
          Default admin: <button onClick={onSignIn} className="font-mono text-teal-600 hover:underline">admin@psychometric.test / Admin@123</button>
        </div>
      </section>
    </div>
  )
}

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const setUser = useApp((s) => s.setUser)
  const setView = useApp((s) => s.setView)
  const [tab, setTab] = useState<'student' | 'admin' | 'counsellor'>(mode === 'register' ? 'student' : 'student')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries())
    setBusy(true)
    try {
      if (mode === 'register') {
        const { user } = await api.register({ name: String(body.name), email: String(body.email), phone: String(body.phone), password: String(body.password) })
        toast.success(`Welcome, ${user.name}! Your student account is ready.`)
        setUser(user)
      } else {
        const role = (tab === 'admin' ? 'SUPER_ADMIN' : tab === 'counsellor' ? 'COUNSELLOR' : 'STUDENT') as Role
        const { user } = await api.login({ email: String(body.email), password: String(body.password), role })
        toast.success(`Welcome back, ${user.name}!`)
        setUser(user)
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white grid place-items-center mx-auto mb-2">
            <Brain className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">{mode === 'register' ? 'Create your account' : 'Welcome back'}</CardTitle>
          <CardDescription>{mode === 'register' ? 'Register as a student to start taking assessments' : 'Sign in to access your dashboard'}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'login' && (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-5">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="student" className="text-xs gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Student</TabsTrigger>
                <TabsTrigger value="admin" className="text-xs gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Admin</TabsTrigger>
                <TabsTrigger value="counsellor" className="text-xs gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Counsellor</TabsTrigger>
              </TabsList>
              <TabsContent value="student" />
              <TabsContent value="admin" />
              <TabsContent value="counsellor" />
            </Tabs>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required minLength={2} placeholder="e.g. Aarav Sharma" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
            </div>
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile Number</Label>
                <Input id="phone" name="phone" required placeholder="9876543210" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={mode === 'register' ? 8 : 1} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11">
              {busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            {mode === 'register' ? (
              <>Already have an account? <button onClick={() => setView('login')} className="text-teal-600 font-semibold hover:underline">Sign in</button></>
            ) : (
              <>New student? <button onClick={() => setView('register')} className="text-teal-600 font-semibold hover:underline">Register here</button></>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
