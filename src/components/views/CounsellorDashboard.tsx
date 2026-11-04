'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResetPasswordDialog } from '@/components/ResetPasswordDialog'
import { Users, FileText, BookOpen, Download, Eye, Stethoscope, Ticket, ClipboardList, Link2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function CounsellorDashboard() {
  const [tab, setTab] = useState('tests')
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2"><Stethoscope className="w-7 h-7 text-teal-600" /> Counsellor Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage your test allocations, assign tests to students, and track progress.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full mb-6">
          <TabsTrigger value="tests" className="text-xs gap-1.5"><Ticket className="w-4 h-4" /> My Tests</TabsTrigger>
          <TabsTrigger value="assignments" className="text-xs gap-1.5"><ClipboardList className="w-4 h-4" /> Assignments</TabsTrigger>
          <TabsTrigger value="students" className="text-xs gap-1.5"><Users className="w-4 h-4" /> Students</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1.5"><FileText className="w-4 h-4" /> Reports</TabsTrigger>
          <TabsTrigger value="manuals" className="text-xs gap-1.5"><BookOpen className="w-4 h-4" /> Manuals</TabsTrigger>
        </TabsList>
        <TabsContent value="tests"><TestsTab /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab /></TabsContent>
        <TabsContent value="students"><StudentsTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="manuals"><ManualsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function useDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); try { setData(await api.counsellorDashboard()) } catch (e: any) { toast.error(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  return { data, loading, load }
}

// --- My Tests tab: credit pool + assign to student ---
function TestsTab() {
  const [data, setData] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assignFor, setAssignFor] = useState<string | null>(null) // assessmentId being assigned
  const [selStudent, setSelStudent] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastLink, setLastLink] = useState<{ testUrl: string; studentName: string; testTitle: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [alloc, dash] = await Promise.all([api.counsellorAllocations(), api.counsellorDashboard()])
      setData(alloc); setStudents(dash.students || [])
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function doAssign() {
    if (!assignFor || !selStudent) return toast.error('Select a student')
    setBusy(true)
    try {
      const r = await api.counsellorAssign({ studentId: selStudent, assessmentId: assignFor })
      const testName = data?.allocations?.find((a: any) => a.assessmentId === assignFor)?.assessment?.title || 'Test'
      const stuName = students.find((s) => s.id === selStudent)?.name || 'Student'
      setLastLink({ testUrl: r.testUrl, studentName: stuName, testTitle: testName })
      setAssignFor(null); setSelStudent('')
      toast.success('Test assigned — unique link generated')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  if (loading) return <div className="grid sm:grid-cols-3 gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>

  const allocations = data?.allocations || []
  const totalAvail = data?.totalAvailable || 0

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-200"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-teal-600">{data?.totalAllocated || 0}</p><p className="text-xs text-slate-500 uppercase tracking-wide">Total Allocated</p></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-amber-600">{data?.totalUsed || 0}</p><p className="text-xs text-slate-500 uppercase tracking-wide">Used</p></CardContent></Card>
        <Card className="border-slate-200"><CardContent className="pt-5 pb-4"><p className="text-2xl font-bold text-emerald-600">{totalAvail}</p><p className="text-xs text-slate-500 uppercase tracking-wide">Available</p></CardContent></Card>
      </div>

      {/* Generated link toast/dialog */}
      {lastLink && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-5">
            <p className="text-sm font-semibold text-emerald-800 mb-1">Test link ready for {lastLink.studentName}</p>
            <p className="text-xs text-slate-600 mb-2">{lastLink.testTitle}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 flex-1 min-w-0 truncate">{typeof window !== 'undefined' ? window.location.origin + lastLink.testUrl : lastLink.testUrl}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText((typeof window !== 'undefined' ? window.location.origin : '') + lastLink.testUrl); toast.success('Link copied') }}><Link2 className="w-3.5 h-3.5" /> Copy</Button>
              <a href={lastLink.testUrl} target="_blank" rel="noreferrer"><Button size="sm" className="bg-teal-600 hover:bg-teal-700"><ExternalLink className="w-3.5 h-3.5" /> Open</Button></a>
              <Button size="sm" variant="ghost" onClick={() => setLastLink(null)}>Dismiss</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available tests */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Available Tests — click to assign</h3>
        {allocations.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No test credits allocated yet. Ask your administrator to allocate tests to your account.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allocations.map((a: any) => {
              const avail = a.available
              return (
                <Card key={a.id} className={`border-slate-200 shadow-sm ${avail === 0 ? 'opacity-60' : 'hover:shadow-md transition-shadow'}`}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div><Badge variant="outline" className="text-[10px] mb-1">{a.assessment.category}</Badge><p className="font-semibold text-slate-900 text-sm leading-snug">{a.assessment.title}</p></div>
                      <div className="text-right flex-shrink-0"><p className={`text-2xl font-bold ${avail > 0 ? 'text-teal-600' : 'text-slate-400'}`}>{avail}</p><p className="text-[10px] text-slate-400">available</p></div>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{a.assessment.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span>{a.assessment.totalQuestions} questions</span><span>{a.used}/{a.quantity} used</span>
                    </div>
                    <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700" disabled={avail === 0} onClick={() => { setAssignFor(a.assessmentId); setSelStudent('') }}>
                      <Ticket className="w-3.5 h-3.5" /> Assign to Student
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign dialog */}
      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Test to Student</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500 -mt-1">Select a student to assign this test. One credit will be consumed and a unique test link generated.</p>
          {students.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No students available. Ask the admin to assign students to you, or the student can self-register.</p>
          ) : (
            <Select value={selStudent} onValueChange={setSelStudent}>
              <SelectTrigger><SelectValue placeholder="Select a student…" /></SelectTrigger>
              <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — {s.email}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button onClick={doAssign} disabled={busy || !selStudent} className="bg-teal-600 hover:bg-teal-700">{busy ? 'Assigning…' : 'Assign & Generate Link'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- Assignments tab: all tests assigned by this counsellor ---
function AssignmentsTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const viewReport = useApp((s) => s.viewReport)
  const load = async () => { setLoading(true); try { setItems((await api.counsellorAssignments()).assignments) } catch (e: any) { toast.error(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  if (loading) return <Skeleton className="h-40 rounded-xl" />
  if (items.length === 0) return <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No tests assigned yet. Go to “My Tests” to assign a test to a student.</CardContent></Card>

  const statusColors: Record<string, string> = { Pending: 'bg-blue-100 text-blue-700', 'In Progress': 'bg-amber-100 text-amber-700', Completed: 'bg-emerald-100 text-emerald-700' }

  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle className="text-sm">Assigned Tests ({items.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase sticky top-0">
              <tr><th className="text-left px-4 py-3 font-semibold">Student</th><th className="text-left px-4 py-3 font-semibold">Test</th><th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Assigned</th><th className="text-left px-4 py-3 font-semibold">Status</th><th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Progress</th><th className="text-right px-4 py-3 font-semibold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{a.studentName}</td>
                  <td className="px-4 py-3 text-slate-600">{a.testTitle}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{new Date(a.assignedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={`text-[10px] font-bold ${statusColors[a.status] || ''}`}>{a.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{a.progress || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {a.testUrl && a.status !== 'Completed' && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => { navigator.clipboard?.writeText((typeof window !== 'undefined' ? window.location.origin : '') + a.testUrl); toast.success('Test link copied') }}><Link2 className="w-3.5 h-3.5" /> Link</Button>
                    )}
                    {a.reportId && (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => viewReport(a.reportId)}><Eye className="w-3.5 h-3.5" /> View Result</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function ReportsTab() {
  const { data, loading } = useDashboard()
  const viewReport = useApp((s) => s.viewReport)
  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
  const reports = data?.reports || []
  if (!reports.length) return <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No reports assigned to you yet.</CardContent></Card>
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {reports.map((r: any) => (
        <Card key={r.id} className="border-slate-200 shadow-sm">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div><p className="font-semibold text-slate-900 text-sm">{r.student.name}</p><p className="text-xs text-slate-500">{r.assessment.title}</p></div>
              <Badge variant="outline" className="text-[10px]">{r.assessment.category}</Badge>
            </div>
            {r.scoreResult?.recommendation && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 mt-2 line-clamp-2">{r.scoreResult.recommendation}</p>}
            <p className="text-xs text-slate-400 mt-2">Completed: {r.attempt?.completedAt ? new Date(r.attempt.completedAt).toLocaleDateString() : '—'}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => viewReport(r.id)}><Eye className="w-3.5 h-3.5" /> View</Button>
              <a href={api.reportDownloadUrl(r.id)} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" /> PDF</Button></a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StudentsTab() {
  const { data, loading } = useDashboard()
  if (loading) return <Skeleton className="h-40 rounded-xl" />
  const students = data?.students || []
  if (!students.length) return <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No students assigned to you.</CardContent></Card>
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3 font-semibold">Name</th><th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Email</th><th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Phone</th><th className="text-right px-4 py-3 font-semibold">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((s: any) => (<tr key={s.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-800">{s.name}</td><td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{s.email}</td><td className="px-4 py-3 text-slate-600 hidden md:table-cell">{s.phone || '—'}</td><td className="px-4 py-3 text-right"><ResetPasswordDialog studentId={s.id} studentName={s.name} /></td></tr>))}
        </tbody>
      </table>
    </div>
  )
}

function ManualsTab() {
  const [manuals, setManuals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any>(null)
  useEffect(() => { api.counsellorManuals().then((r) => setManuals(r.manuals)).catch(() => {}).finally(() => setLoading(false)) }, [])
  if (loading) return <div className="grid sm:grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        {manuals.map((m) => (
          <Card key={m.id} className="border-slate-200 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 grid place-items-center flex-shrink-0"><BookOpen className="w-5 h-5 text-purple-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug">{m.assessment.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.assessment.purpose}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={async () => { try { setViewing({ loading: true }); const { manual } = await api.counsellorManual(m.assessmentId); setViewing({ ...manual, assessment: m.assessment }) } catch (e: any) { toast.error(e.message) } }}><Eye className="w-3.5 h-3.5" /> Read</Button>
                <a href={api.manualDownloadUrl(m.assessmentId)} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" /> PDF</Button></a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
          {viewing?.loading ? <Skeleton className="h-40" /> : viewing && (
            <>
              <DialogHeader><DialogTitle className="text-lg">{viewing.title}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm">
                <Section title="Purpose" body={viewing.content.purpose} />
                <Section title="Constructs Measured" body={viewing.content.constructsMeasured} />
                <Section title="Target Population" body={viewing.content.targetPopulation} />
                <Section title="Scoring Methodology" body={viewing.content.scoringMethodology} />
                <div>
                  <p className="font-bold text-slate-800 mb-2">Dimensions & Interpretation Bands</p>
                  <div className="space-y-2">
                    {viewing.content.dimensions.map((d: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                        <p className="font-semibold text-slate-800 text-sm">{d.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{d.description}</p>
                        <div className="grid sm:grid-cols-3 gap-2 mt-2 text-xs">
                          <p><span className="font-semibold text-emerald-600">High:</span> {d.high}</p>
                          <p><span className="font-semibold text-teal-600">Moderate:</span> {d.moderate}</p>
                          <p><span className="font-semibold text-amber-600">Low:</span> {d.low}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Section title="Behavioural Indicators" list={viewing.content.behaviouralIndicators} />
                <Section title="Strengths & Development Areas" body={viewing.content.strengthsAndDevelopment} />
                <Section title="Counselling Approach" body={viewing.content.counsellingApproach} />
                <Section title="Assessment Limitations" body={viewing.content.limitations} />
                <Section title="Sample Interpretation" body={viewing.content.sampleInterpretation} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function Section({ title, body, list }: { title: string; body?: string; list?: string[] }) {
  return (
    <div>
      <p className="font-bold text-slate-800 mb-1">{title}</p>
      {body && <p className="text-slate-600 leading-relaxed">{body}</p>}
      {list && <ul className="space-y-1 text-slate-600">{list.map((b, i) => <li key={i} className="flex gap-2"><span className="text-teal-500">•</span><span>{b}</span></li>)}</ul>}
    </div>
  )
}
