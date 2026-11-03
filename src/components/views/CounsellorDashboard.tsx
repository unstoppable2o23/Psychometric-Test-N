'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, FileText, BookOpen, Download, Eye, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'

export function CounsellorDashboard() {
  const [tab, setTab] = useState('reports')
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2"><Stethoscope className="w-7 h-7 text-teal-600" /> Counsellor Dashboard</h1>
        <p className="text-slate-500 mt-1">Access authorised student reports and confidential interpretation manuals.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full sm:w-auto mb-6">
          <TabsTrigger value="reports" className="text-xs gap-1.5"><FileText className="w-4 h-4" /> Reports</TabsTrigger>
          <TabsTrigger value="students" className="text-xs gap-1.5"><Users className="w-4 h-4" /> Students</TabsTrigger>
          <TabsTrigger value="manuals" className="text-xs gap-1.5"><BookOpen className="w-4 h-4" /> Manuals</TabsTrigger>
        </TabsList>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="students"><StudentsTab /></TabsContent>
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
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr><th className="text-left px-4 py-3 font-semibold">Name</th><th className="text-left px-4 py-3 font-semibold">Email</th><th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Phone</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((s: any) => (<tr key={s.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium text-slate-800">{s.name}</td><td className="px-4 py-3 text-slate-600">{s.email}</td><td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{s.phone}</td></tr>))}
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
