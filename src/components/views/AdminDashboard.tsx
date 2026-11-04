'use client'
import { useEffect, useState, useCallback } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ResetPasswordDialog } from '@/components/ResetPasswordDialog'
import { Users, FileText, ClipboardList, Stethoscope, Activity, ShieldCheck, UserPlus, Download, Search, BookOpen, Award, Ticket, Lock } from 'lucide-react'
import { toast } from 'sonner'

export function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-7 h-7 text-teal-600" /> Super Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Manage students, assessments, reports and counsellors.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full mb-6 h-auto">
          <TabsTrigger value="overview" className="text-xs gap-1.5 py-2"><Activity className="w-4 h-4" /> Overview</TabsTrigger>
          <TabsTrigger value="students" className="text-xs gap-1.5 py-2"><Users className="w-4 h-4" /> Students</TabsTrigger>
          <TabsTrigger value="assign" className="text-xs gap-1.5 py-2"><ClipboardList className="w-4 h-4" /> Assign</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1.5 py-2"><FileText className="w-4 h-4" /> Reports</TabsTrigger>
          <TabsTrigger value="counsellors" className="text-xs gap-1.5 py-2"><Stethoscope className="w-4 h-4" /> Counsellors</TabsTrigger>
          <TabsTrigger value="allocations" className="text-xs gap-1.5 py-2"><Ticket className="w-4 h-4" /> Allocs</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5 py-2"><BookOpen className="w-4 h-4" /> Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="students"><StudentsTab /></TabsContent>
        <TabsContent value="assign"><AssignTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="counsellors"><CounsellorsTab /></TabsContent>
        <TabsContent value="allocations"><AllocationsTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab() {
  const [stats, setStats] = useState<any>(null)
  const [assessments, setAssessments] = useState<any[]>([])
  useEffect(() => { api.adminAnalytics().then(setStats).catch(() => {}); api.assessments().then((r) => setAssessments(r.assessments)).catch(() => {}) }, [])
  if (!stats) return <Skeletons n={4} />
  const cards = [
    { label: 'Students', value: stats.totalStudents, icon: Users, color: 'text-teal-600 bg-teal-50' },
    { label: 'Counsellors', value: stats.totalCounsellors, icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Assessments', value: stats.totalAssessments, icon: BookOpen, color: 'text-amber-600 bg-amber-50' },
    { label: 'Assigned Tests', value: stats.assignedTests, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending', value: stats.pendingTests, icon: Activity, color: 'text-orange-600 bg-orange-50' },
    { label: 'In Progress', value: stats.inProgressTests, icon: Activity, color: 'text-purple-600 bg-purple-50' },
    { label: 'Completed', value: stats.completedTests, icon: Award, color: 'text-green-600 bg-green-50' },
    { label: 'Reports', value: stats.reportsGenerated, icon: FileText, color: 'text-rose-600 bg-rose-50' },
  ]
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-slate-200 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className={`w-9 h-9 rounded-lg grid place-items-center mb-2 ${c.color}`}><c.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Available Assessments</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {assessments.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between mb-1"><Badge variant="outline" className="text-[10px]">{a.category}</Badge><span className="text-xs text-slate-400">{a.totalQuestions}q</span></div>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{a.title}</p>
                <p className="text-xs text-slate-500 mt-1">~{a.estimatedMinutes} min</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StudentsTab() {
  const [q, setQ] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const load = useCallback(async () => { setLoading(true); try { setStudents((await api.adminStudents(q)).students) } catch (e: any) { toast.error(e.message) } finally { setLoading(false) } }, [q])
  useEffect(() => { api.assessments().then((r) => setAssessments(r.assessments)).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  async function toggleActive(s: any) {
    try { await api.adminUpdateStudent(s.id, { isActive: !s.isActive }); toast.success(`${s.name} ${!s.isActive ? 'activated' : 'deactivated'}`); load() } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className="pl-9" />
        </div>
        <CreateStudentDialog assessments={assessments} onCreated={() => { setCreating(false); load() }} />
      </div>

      {loading ? <Skeletons n={3} /> : students.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No students found.</CardContent></Card>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                <tr><th className="text-left px-4 py-3 font-semibold">Name</th><th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Email</th><th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Phone</th><th className="text-left px-4 py-3 font-semibold">Status</th><th className="text-right px-4 py-3 font-semibold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{s.email}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{s.phone}</td>
                    <td className="px-4 py-3"><Badge variant={s.isActive ? 'default' : 'secondary'} className={s.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>{s.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(s)} className="text-xs">{s.isActive ? 'Deactivate' : 'Activate'}</Button>
                      <ResetPasswordDialog userId={s.id} userName={s.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateStudentDialog({ assessments, onCreated }: { assessments: any[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>([])
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const phone = String(fd.get('phone') || '').trim()
    const body = { name: String(fd.get('name')), email: String(fd.get('email')), ...(phone ? { phone } : {}), password: String(fd.get('password') || ''), assignAssessmentIds: selectedAssessments }
    setBusy(true)
    try { await api.adminCreateStudent(body); toast.success('Student created' + (selectedAssessments.length ? ` & ${selectedAssessments.length} test(s) assigned` : '')); setOpen(false); onCreated() } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-teal-600 hover:bg-teal-700"><UserPlus className="w-4 h-4" /> Register Student</Button></DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Register a Student</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name</Label><Input name="name" required minLength={2} /></div>
          <div><Label>Email</Label><Input name="email" type="email" required /></div>
          <div><Label>Phone <span className="text-xs text-slate-400">(optional)</span></Label><Input name="phone" /></div>
          <div><Label>Password <span className="text-xs text-slate-400">(optional — default: Student@123)</span></Label><Input name="password" type="password" placeholder="At least 8 characters" /></div>
          <div>
            <Label className="mb-2 block">Assign tests immediately (optional)</Label>
            <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border border-slate-200 p-3">
              {assessments.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedAssessments.includes(a.id)} onCheckedChange={(v) => v ? setSelectedAssessments((p) => [...p, a.id]) : setSelectedAssessments((p) => p.filter((x) => x !== a.id))} />
                  <span className="text-slate-700">{a.title}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-700">{busy ? 'Creating…' : 'Create Student'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AssignTab() {
  const [students, setStudents] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [selStudents, setSelStudents] = useState<string[]>([])
  const [selAssessments, setSelAssessments] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const load = async () => {
    try {
      const [s, a, asg] = await Promise.all([api.adminStudents(), api.assessments(), api.adminAssignments()])
      setStudents(s.students); setAssessments(a.assessments); setAssignments(asg.assignments)
    } catch (e: any) { toast.error(e.message) }
  }
  useEffect(() => { load() }, [])
  async function assign() {
    if (!selStudents.length || !selAssessments.length) return toast.error('Select at least one student and one assessment')
    setBusy(true)
    try { const r = await api.adminAssign({ studentIds: selStudents, assessmentIds: selAssessments }); toast.success(`Assigned ${r.count} test(s)`); setSelStudents([]); setSelAssessments([]); load() } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-sm">1. Select Students</CardTitle></CardHeader>
        <CardContent className="max-h-72 overflow-y-auto space-y-1.5">
          {students.length === 0 ? <p className="text-sm text-slate-400">No students.</p> : students.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <Checkbox checked={selStudents.includes(s.id)} onCheckedChange={() => toggle(selStudents, setSelStudents, s.id)} />
              <span className="text-slate-700">{s.name}</span><span className="text-xs text-slate-400 ml-auto">{s.email}</span>
            </label>
          ))}
        </CardContent>
      </Card>
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-sm">2. Select Assessments</CardTitle></CardHeader>
        <CardContent className="max-h-72 overflow-y-auto space-y-1.5">
          {assessments.map((a) => (
            <label key={a.id} className="flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <Checkbox checked={selAssessments.includes(a.id)} onCheckedChange={() => toggle(selAssessments, setSelAssessments, a.id)} />
              <span className="text-slate-700">{a.title}<br /><span className="text-xs text-slate-400">{a.category} &middot; {a.totalQuestions}q</span></span>
            </label>
          ))}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card className="border-slate-200">
          <CardContent className="pt-5">
            <p className="text-sm text-slate-600 mb-3">{selStudents.length} student(s) × {selAssessments.length} assessment(s)</p>
            <Button onClick={assign} disabled={busy || !selStudents.length || !selAssessments.length} className="w-full bg-teal-600 hover:bg-teal-700"><ClipboardList className="w-4 h-4" /> Generate Secure Links</Button>
            <p className="text-xs text-slate-400 mt-2">Each student gets a unique cryptographically-secure link per attempt.</p>
          </CardContent>
        </Card>
      </div>
      <Card className="border-slate-200 lg:col-span-3">
        <CardHeader><CardTitle className="text-sm">All Assignments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase sticky top-0"><tr><th className="text-left px-4 py-2 font-semibold">Student</th><th className="text-left px-4 py-2 font-semibold">Assessment</th><th className="text-left px-4 py-2 font-semibold">Status</th><th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">Assigned</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{a.student.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{a.assessment.title}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs hidden sm:table-cell">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportsTab() {
  const [reports, setReports] = useState<any[]>([])
  const [counsellors, setCounsellors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [assignFor, setAssignFor] = useState<string | null>(null)
  const viewReport = useApp((s) => s.viewReport)
  const load = async () => { setLoading(true); try { const [r, c] = await Promise.all([api.adminReports(), api.adminCounsellors()]); setReports(r.reports); setCounsellors(c.counsellors) } catch (e: any) { toast.error(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  async function assign(reportId: string, cIds: string[]) {
    try { await api.adminAssignReport(reportId, cIds); toast.success('Report access granted'); setAssignFor(null); load() } catch (e: any) { toast.error(e.message) }
  }
  async function unlock(reportId: string) {
    try { await api.adminUnlockReport(reportId); toast.success('Report unlocked — student can now view & download it'); load() } catch (e: any) { toast.error(e.message) }
  }
  return (
    <div className="space-y-4">
      {loading ? <Skeletons n={3} /> : reports.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No reports generated yet. Reports appear after students complete assessments.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {reports.map((r) => (
            <Card key={r.id} className="border-slate-200 shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div><p className="font-semibold text-slate-900 text-sm">{r.student.name}</p><p className="text-xs text-slate-500">{r.assessment.title}</p></div>
                  {r.paymentStatus === 'PAID'
                    ? <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Unlocked</Badge>
                    : <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">Locked</Badge>}
                </div>
                {r.scoreResult?.recommendation && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 mt-2 line-clamp-2">{r.scoreResult.recommendation}</p>}
                <div className="flex items-center gap-1.5 mt-3 mb-3 flex-wrap">
                  {r.counsellorAccess.map((c: any) => <Badge key={c.id} variant="secondary" className="text-[10px]">{c.counsellor.name}</Badge>)}
                  {r.counsellorAccess.length === 0 && <span className="text-xs text-slate-400">No counsellor access</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => viewReport(r.id)}><FileText className="w-3.5 h-3.5" /> View</Button>
                  <a href={api.reportDownloadUrl(r.id)} target="_blank" rel="noreferrer"><Button size="sm" variant="outline"><Download className="w-3.5 h-3.5" /> PDF</Button></a>
                  {r.paymentStatus !== 'PAID' && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => unlock(r.id)}><Lock className="w-3.5 h-3.5" /> Unlock for Student</Button>}
                  <Select value="" onValueChange={(v) => { if (v) assign(r.id, [v]) }}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Grant access…" /></SelectTrigger>
                    <SelectContent>{counsellors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {assignFor && null}
    </div>
  )
}

function CounsellorsTab() {
  const [counsellors, setCounsellors] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const load = async () => { try { const [c, s] = await Promise.all([api.adminCounsellors(), api.adminStudents()]); setCounsellors(c.counsellors); setStudents(s.students) } catch (e: any) { toast.error(e.message) } }
  useEffect(() => { load() }, [])
  const [selC, setSelC] = useState('')
  const [selS, setSelS] = useState<string[]>([])
  async function assign() {
    if (!selC || !selS.length) return toast.error('Select a counsellor and students')
    setBusy(true)
    try { const r = await api.adminAssignCounsellor({ counsellorId: selC, studentIds: selS }); toast.success(`${r.count} student(s) assigned`); setSelS([]); load() } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-5">
      <CreateCounsellorDialog onCreated={load} />
      <div className="grid sm:grid-cols-2 gap-3">
        {counsellors.map((c) => (
          <Card key={c.id} className="border-slate-200 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between mb-2"><p className="font-semibold text-slate-900">{c.name}</p><Badge variant={c.isActive ? 'default' : 'secondary'} className={c.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>{c.isActive ? 'Active' : 'Inactive'}</Badge></div>
              <p className="text-xs text-slate-500">{c.email} &middot; {c.phone}</p>
              <p className="text-xs text-slate-400 mt-2">{c.counsellorStudents?.length || 0} student(s) assigned</p>
              <div className="mt-3"><ResetPasswordDialog userId={c.id} userName={c.name} /></div>
            </CardContent>
          </Card>
        ))}
        {counsellors.length === 0 && <Card className="border-dashed col-span-2"><CardContent className="py-10 text-center text-slate-500">No counsellors yet. Create one above.</CardContent></Card>}
      </div>
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-sm">Assign Students to a Counsellor</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={selC} onValueChange={setSelC}><SelectTrigger><SelectValue placeholder="Select counsellor…" /></SelectTrigger><SelectContent>{counsellors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 p-3">
            {students.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={selS.includes(s.id)} onCheckedChange={(v) => v ? setSelS((p) => [...p, s.id]) : setSelS((p) => p.filter((x) => x !== s.id))} /><span className="text-slate-700">{s.name}</span></label>
            ))}
          </div>
          <Button onClick={assign} disabled={busy} className="bg-teal-600 hover:bg-teal-700">Assign {selS.length || ''} student(s)</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function CreateCounsellorDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget)
    setBusy(true)
    try { await api.adminCreateCounsellor({ name: String(fd.get('name')), email: String(fd.get('email')), phone: String(fd.get('phone')), password: String(fd.get('password') || '') }); toast.success('Counsellor created'); setOpen(false); onCreated() } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-teal-600 hover:bg-teal-700"><UserPlus className="w-4 h-4" /> Create Counsellor</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a Counsellor Account</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name</Label><Input name="name" required minLength={2} /></div>
          <div><Label>Email</Label><Input name="email" type="email" required /></div>
          <div><Label>Phone</Label><Input name="phone" required /></div>
          <div><Label>Password <span className="text-xs text-slate-400">(optional — default: Counsellor@123)</span></Label><Input name="password" type="password" placeholder="At least 8 characters" /></div>
          <DialogFooter><Button type="submit" disabled={busy} className="bg-teal-600 hover:bg-teal-700">{busy ? 'Creating…' : 'Create Counsellor'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AuditTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.adminAudit(150).then((r) => setLogs(r.logs)).catch(() => {}).finally(() => setLoading(false)) }, [])
  if (loading) return <Skeletons n={4} />
  return (
    <Card className="border-slate-200">
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase sticky top-0"><tr><th className="text-left px-4 py-2 font-semibold">Time</th><th className="text-left px-4 py-2 font-semibold">Action</th><th className="text-left px-4 py-2 font-semibold hidden sm:table-cell">Actor</th><th className="text-left px-4 py-2 font-semibold hidden md:table-cell">Target</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-xs text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-700">{l.action}</td>
                  <td className="px-4 py-2 text-xs text-slate-500 hidden sm:table-cell">{l.actorRole || '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-400 hidden md:table-cell font-mono">{l.targetType || '—'}{l.targetId ? `:${l.targetId.slice(-6)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function AllocationsTab() {
  const [allocations, setAllocations] = useState<any[]>([])
  const [counsellors, setCounsellors] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selCounsellor, setSelCounsellor] = useState('')
  const [selAssessment, setSelAssessment] = useState('')
  const [qty, setQty] = useState('10')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [a, c, asg] = await Promise.all([api.adminAllocations(), api.adminCounsellors(), api.assessments()])
      setAllocations(a.allocations); setCounsellors(c.counsellors); setAssessments(asg.assessments)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function setAllocation() {
    if (!selCounsellor || !selAssessment) return toast.error('Select a counsellor and an assessment')
    const n = parseInt(qty, 10)
    if (isNaN(n) || n < 0) return toast.error('Enter a valid quantity')
    setBusy(true)
    try { await api.adminSetAllocation({ counsellorId: selCounsellor, assessmentId: selAssessment, quantity: n }); toast.success(`Allocation set: ${n} credits`); load() } catch (e: any) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  async function removeAlloc(id: string) {
    try { await api.adminDeleteAllocation(id); toast.success('Allocation removed'); load() } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Ticket className="w-4 h-4 text-teal-600" /> Allocate Test Credits to a Counsellor</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5">
            <Label>Counsellor</Label>
            <Select value={selCounsellor} onValueChange={setSelCounsellor}>
              <SelectTrigger><SelectValue placeholder="Select counsellor…" /></SelectTrigger>
              <SelectContent>{counsellors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assessment</Label>
            <Select value={selAssessment} onValueChange={setSelAssessment}>
              <SelectTrigger><SelectValue placeholder="Select test…" /></SelectTrigger>
              <SelectContent>{assessments.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Quantity (credits)</Label>
            <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <Button onClick={setAllocation} disabled={busy} className="bg-teal-600 hover:bg-teal-700"><Ticket className="w-4 h-4" /> Set Allocation</Button>
        </CardContent>
      </Card>

      {loading ? <Skeletons n={3} /> : allocations.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-slate-500">No allocations yet. Allocate test credits to counsellors above.</CardContent></Card>
      ) : (
        <Card className="border-slate-200">
          <CardHeader><CardTitle className="text-sm">All Allocations & Usage</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr>
                  <th className="text-left px-4 py-3 font-semibold">Counsellor</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Test</th>
                  <th className="text-center px-4 py-3 font-semibold">Allocated</th>
                  <th className="text-center px-4 py-3 font-semibold">Used</th>
                  <th className="text-center px-4 py-3 font-semibold">Available</th>
                  <th className="text-right px-4 py-3 font-semibold">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {allocations.map((a) => {
                    const avail = a.quantity - a.used
                    return (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{a.counsellor.name}</td>
                        <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{a.assessment.title}</td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">{a.quantity}</td>
                        <td className="px-4 py-3 text-center text-amber-600 font-medium">{a.used}</td>
                        <td className="px-4 py-3 text-center"><Badge variant="outline" className={avail > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400'}>{avail}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" className="text-xs text-rose-500 hover:text-rose-700" onClick={() => removeAlloc(a.id)} disabled={a.used > 0}>{a.used > 0 ? 'In use' : 'Remove'}</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { ASSIGNED: 'bg-blue-100 text-blue-700', IN_PROGRESS: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700' }
  return <Badge variant="outline" className={`text-[10px] font-bold uppercase ${map[status] || ''}`}>{status.replace('_', ' ')}</Badge>
}
function Skeletons({ n }: { n: number }) { return <div className="space-y-3">{[...Array(n)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div> }
