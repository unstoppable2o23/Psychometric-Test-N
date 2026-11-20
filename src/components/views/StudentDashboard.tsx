'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Play, RefreshCw, CheckCircle2, FileText, Clock, ListChecks, Trophy, Lock, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export function StudentDashboard() {
  const user = useApp((s) => s.user)!
  const viewReport = useApp((s) => s.viewReport)
  const [data, setData] = useState<{ student: any; assignments: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setData(await api.studentDashboard()) } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function handleStart(assignmentId: string, title: string, slug?: string) {
    setStarting(assignmentId)
    // Open a blank tab synchronously within the user gesture so popup blockers don't block it.
    // We then redirect it to the test URL once the token is ready.
    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Popup blocked. Please allow popups for this site to start your test.')
      setStarting(null)
      return
    }
    win.document.write('<html><head><title>Preparing your test…</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#0f766e;background:#f0fdfa;} .s{display:flex;flex-direction:column;align-items:center;gap:14px;} .spin{width:36px;height:36px;border:4px solid #ccfbf1;border-top-color:#0d9488;border-radius:50%;animation:sp 0.8s linear infinite;} @keyframes sp{to{transform:rotate(360deg)}} p{color:#0f766e;font-weight:600;}</style></head><body><div class="s"><div class="spin"></div><p>Preparing your test…</p></div></body></html>')
    win.document.close()
    try {
      // Use the platform TestRunner for all tests (supports resume, progress bar, badges)
      const { token } = await api.startTest(assignmentId)
      win.location.href = `/?test=${token}`
      toast.success(`${title} is opening in a new tab…`)
    } catch (e: any) {
      win.close()
      toast.error(e.message)
    } finally { setStarting(null) }
  }

  const completed = data?.assignments.filter((a) => a.status === 'COMPLETED').length || 0
  const total = data?.assignments.length || 0

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Hello, {user.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 mt-1">Your assigned assessments and reports, all in one place.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center px-4 py-2 rounded-xl bg-white border border-slate-200">
            <p className="text-2xl font-bold text-teal-600">{completed}</p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Completed</p>
          </div>
          <div className="text-center px-4 py-2 rounded-xl bg-white border border-slate-200">
            <p className="text-2xl font-bold text-amber-600">{total - completed}</p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Pending</p>
          </div>
        </div>
      </div>

      {/* Assignments */}
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ListChecks className="w-5 h-5 text-teal-600" /> Your Assessments</h2>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : data!.assignments.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="py-14 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No assessments assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Your administrator will assign psychometric tests to you. Check back soon!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data!.assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              a={a}
              starting={starting === a.id}
              onStart={() => handleStart(a.id, a.assessment.title, a.assessment.slug)}
              onViewReport={() => a.reportId && viewReport(a.reportId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AssignmentCard({ a, starting, onStart, onViewReport }: { a: any; starting: boolean; onStart: () => void; onViewReport: () => void }) {
  const statusColors: Record<string, string> = {
    ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${statusColors[a.status]}`}>{a.status.replace('_', ' ')}</Badge>
            <CardTitle className="text-base leading-snug">{a.assessment.title}</CardTitle>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400">{a.assessment.category}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 justify-end"><Clock className="w-3 h-3" /> ~{a.assessment.estimatedMinutes} min</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{a.assessment.description}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <span className="flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> {a.assessment.totalQuestions} questions</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          {a.status === 'IN_PROGRESS' && (
            <div className="flex-1"><Progress value={40} className="h-1.5" /><p className="text-[11px] text-slate-400 mt-1">In progress — resume anytime</p></div>
          )}
          {a.status === 'COMPLETED' && a.reportAvailable && (
            <div className="flex-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-4 h-4" /> Report generated</div>
          )}
          {a.status === 'COMPLETED' && !a.reportAvailable && (
            <div className="flex-1 text-xs text-slate-400">Awaiting report</div>
          )}
          {a.status === 'ASSIGNED' && <div className="flex-1 text-xs text-slate-400">Not started</div>}

          {a.button === 'START' && <Button onClick={onStart} disabled={starting} className="bg-teal-600 hover:bg-teal-700"><Play className="w-4 h-4" /> {starting ? 'Opening…' : 'Start Test'}</Button>}
          {a.button === 'CONTINUE' && <Button onClick={onStart} disabled={starting} className="bg-amber-600 hover:bg-amber-700"><RefreshCw className={`w-4 h-4 ${starting ? 'animate-spin' : ''}`} /> {starting ? 'Opening…' : 'Continue'}</Button>}
          {a.button === 'COMPLETED' && <Button disabled variant="secondary"><CheckCircle2 className="w-4 h-4" /> Completed</Button>}
          {a.button === 'VIEW_REPORT' && <Button onClick={onViewReport} variant="default" className="bg-emerald-600 hover:bg-emerald-700"><FileText className="w-4 h-4" /> View Report</Button>}
          {a.status === 'COMPLETED' && a.reportAvailable && a.button !== 'VIEW_REPORT' && (
            <Button disabled variant="outline" className="text-slate-400"><Lock className="w-3.5 h-3.5" /> Report locked</Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
