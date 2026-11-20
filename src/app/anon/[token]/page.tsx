'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Brain, CheckCircle2, PartyPopper, FileText, Download, Trophy, Star, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toast } from 'sonner'

const LEVEL_COLORS: Record<string, string> = { High: '#15803D', Dominant: '#15803D', Moderate: '#0E7C66', Low: '#B45309' }

export default function AnonTestPage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [phase, setPhase] = useState<'loading' | 'register' | 'redirecting' | 'report' | 'error'>('loading')
  const [linkData, setLinkData] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadLink = useCallback(async () => {
    try {
      const res = await fetch(`/api/anon/${token}`)
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || 'Invalid link'); setPhase('error'); return }
      setLinkData(data)

      if (data.isCompleted) {
        // Test is completed — load the report
        const repRes = await fetch(`/api/anon/${token}/report`)
        const repData = await repRes.json()
        if (repRes.ok) { setReport(repData.report); setPhase('report') }
        else { setErrorMsg('Failed to load report'); setPhase('error') }
      } else if (data.isRegistered && data.testToken) {
        // Registered but not completed — resume via platform TestRunner
        // Redirect to /?test=TOKEN&anon=ANON_TOKEN
        window.location.href = `/?test=${data.testToken}&anon=${token}`
      } else if (data.isRegistered && !data.testToken) {
        // Registered but no active token — shouldn't happen, but handle it
        setErrorMsg('Your test session has expired. Please contact the administrator.')
        setPhase('error')
      } else {
        // Not registered — show registration form
        setPhase('register')
      }
    } catch { setErrorMsg('Failed to load'); setPhase('error') }
  }, [token])

  useEffect(() => { loadLink() }, [loadLink])

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    try {
      const fd = new FormData(e.currentTarget)
      const res = await fetch(`/api/anon/${token}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone') }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Registration failed'); setBusy(false); return }
      toast.success('Registration successful! Starting test...')
      // Redirect to platform TestRunner with anon token for report access after completion
      window.location.href = `/?test=${data.testToken}&anon=${token}`
    } catch (e: any) { toast.error(e.message); setBusy(false) }
  }

  // Error state
  if (phase === 'error') {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
        <Card className="max-w-md shadow-lg">
          <CardContent className="pt-10 pb-10 text-center">
            <p className="text-rose-600 font-medium text-lg">{errorMsg}</p>
            <a href="/"><Button className="mt-4" variant="outline">Go Home</Button></a>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (phase === 'loading' || phase === 'redirecting') {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500">{phase === 'redirecting' ? 'Starting your assessment...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  // Registration form
  if (phase === 'register' && linkData) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-teal-50/30 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-full max-w-md shadow-xl">
            <div className="h-2 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white grid place-items-center mx-auto mb-2">
                <Brain className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">{linkData.assessment.title}</CardTitle>
              <p className="text-sm text-slate-500">{linkData.assessment.totalQuestions} questions · ~{linkData.assessment.estimatedMinutes} min</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">Please fill in your details to start the assessment. Your progress will be saved automatically.</p>
              <form onSubmit={register} className="space-y-3">
                <div><Label>Full Name</Label><Input name="name" required minLength={2} placeholder="Your full name" autoFocus /></div>
                <div><Label>Email Address</Label><Input name="email" type="email" required placeholder="you@example.com" /></div>
                <div><Label>Mobile Number</Label><Input name="phone" required placeholder="9876543210" /></div>
                <Button type="submit" disabled={busy} className="w-full bg-teal-600 hover:bg-teal-700 h-11 text-base">
                  {busy ? 'Please wait...' : 'Submit & Start Test'}
                </Button>
              </form>
              <p className="text-xs text-slate-400 mt-3 text-center">You can pause and resume the test anytime using the same link.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Report view (after test completion)
  if (phase === 'report' && report) {
    const dims = report.score.dimensions || []
    const chartData = dims.map((d: any) => ({ name: d.name?.length > 18 ? d.name.slice(0, 16) + '...' : d.name, pct: d.pct, level: d.level }))
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 text-white grid place-items-center"><Brain className="w-5 h-5" /></span>
              <span className="font-bold text-slate-900">Psychometric Platform</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="w-4 h-4" /> Print / Save PDF</Button>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Completion celebration */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto mb-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 grid place-items-center mx-auto mb-3 shadow-lg">
              <PartyPopper className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-extrabold text-slate-900">Assessment Complete!</h1>
            <p className="text-slate-600 mt-1">Your report is ready, {report.student.name}.</p>
          </motion.div>

          {/* Report card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-lg overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400" />
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{report.assessment.title}</h2>
                    <p className="text-sm text-slate-500">Report for <span className="font-semibold">{report.student.name}</span></p>
                  </div>
                  <Badge variant="outline">{report.assessment.category}</Badge>
                </div>

                {report.score.recommendation && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Key Result</p>
                    <p className="text-slate-800">{report.score.recommendation}</p>
                  </div>
                )}

                {chartData.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3">Dimension Profile</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
                          <Tooltip />
                          <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                            {chartData.map((d: any, i: number) => <Cell key={i} fill={LEVEL_COLORS[d.level] || '#0E7C66'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {dims.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-800 mb-3">Detailed Breakdown</h3>
                    <div className="space-y-2">
                      {dims.map((d: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border-l-4 bg-slate-50" style={{ borderColor: LEVEL_COLORS[d.level] || '#0E7C66' }}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
                              <Badge variant="outline" className="text-[10px]">{d.level}</Badge>
                            </div>
                            {d.dimensionDescription && <p className="text-xs text-slate-500 mt-0.5">{d.dimensionDescription}</p>}
                            {d.strengths?.length > 0 && (
                              <div className="mt-1.5">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">Strengths</p>
                                <ul className="space-y-0.5">{d.strengths.slice(0, 3).map((s: string, j: number) => <li key={j} className="text-xs text-slate-600 flex gap-1"><span className="text-emerald-500">+</span>{s}</li>)}</ul>
                              </div>
                            )}
                          </div>
                          <div className="text-right"><p className="text-lg font-bold">{d.pct}%</p><p className="text-[10px] text-slate-400">{d.score}/{d.maxScore}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  This report is based on a self-report psychometric screening instrument. It is not a clinical diagnosis.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  return null
}
