'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Download, FileText, Lock, Sparkles } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toast } from 'sonner'

const LEVEL_COLORS: Record<string, string> = { High: '#15803D', Dominant: '#15803D', Moderate: '#0E7C66', Low: '#B45309' }

export function ReportView() {
  const reportId = useApp((s) => s.reportId)!
  const setView = useApp((s) => s.setView)
  const user = useApp((s) => s.user)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interpretation, setInterpretation] = useState<string | null>(null)
  const [showInterpretation, setShowInterpretation] = useState(false)

  useEffect(() => {
    api.report(reportId).then((r) => setReport(r.report)).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [reportId])

  const loadInterpretation = async () => {
    try {
      setShowInterpretation(true)
      const r = await api.reportInterpretation(reportId)
      setInterpretation(r.interpretation)
    } catch (e: any) { toast.error(e.message) }
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10"><Skeleton className="h-96 rounded-xl" /></div>
  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-700 font-semibold">{error}</p>
      <Button onClick={() => setView('student-dashboard')} className="mt-4" variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
    </div>
  )

  const score = report.score
  const dims = score.dimensions || []
  const chartData = dims.map((d: any) => ({ name: d.name?.length > 18 ? d.name.slice(0, 16) + '…' : d.name, pct: d.pct, level: d.level, full: d.name }))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Button variant="ghost" onClick={() => setView(user?.role === 'STUDENT' ? 'student-dashboard' : user?.role === 'COUNSELLOR' ? 'counsellor-dashboard' : 'admin-dashboard')} className="mb-4 text-slate-600"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</Button>

      <Card className="border-slate-200 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400" />
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl">{report.assessment.title}</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Report for <span className="font-semibold text-slate-700">{report.student.name}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{report.assessment.category}</Badge>
              <a href={api.reportDownloadUrl(report.id)} target="_blank" rel="noreferrer">
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700"><Download className="w-4 h-4" /> Download A4 PDF</Button>
              </a>
              {user?.role !== 'STUDENT' && (
                <Button size="sm" variant="outline" onClick={loadInterpretation}><Sparkles className="w-4 h-4 text-teal-600" /> Smart Interpretation</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Student info */}
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <Info label="Student" value={report.student.name} />
            <Info label="Email" value={report.student.email} />
            <Info label="Mobile" value={report.student.phone || '—'} />
            <Info label="Completed" value={report.attempt?.completedAt ? new Date(report.attempt.completedAt).toLocaleDateString() : '—'} />
          </div>

          {/* Recommendation */}
          {score.recommendation && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Key Recommendation</p>
              <p className="text-slate-800 font-medium">{score.recommendation}</p>
            </div>
          )}

          {/* Domain breakdown (stream selector) */}
          {score.domainBreakdown && (
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /> Stream Comparison</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {score.domainBreakdown.map((b: any, i: number) => (
                  <div key={b.code} className={`p-4 rounded-xl border ${i === 0 ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="w-7 h-7 rounded-full text-xs font-bold grid place-items-center text-white" style={{ background: i === 0 ? '#F59E0B' : '#CBD5E1' }}>{i + 1}</span>
                      {i === 0 && <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">Recommended</Badge>}
                    </div>
                    <p className="font-bold text-slate-900 mt-2">{b.title}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                      <div><p className="text-slate-400">Aptitude</p><p className="font-bold text-slate-700">{b.aptitude}</p></div>
                      <div><p className="text-slate-400">Interest</p><p className="font-bold text-slate-700">{b.interest}</p></div>
                      <div><p className="text-slate-400">Composite</p><p className="font-bold text-teal-600 text-base">{b.composite}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-3">Dimension Profile</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#334155' }} width={120} />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Score']} labelFormatter={(l: any) => chartData.find((d: any) => d.name === l)?.full || l} />
                    <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
                      {chartData.map((d: any, i: number) => <Cell key={i} fill={LEVEL_COLORS[d.level] || '#0E7C66'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Dimension details */}
          {dims.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-800 mb-3">Detailed Breakdown</h3>
              <div className="space-y-3">
                {dims.map((d: any, i: number) => (
                  <div key={i} className="rounded-lg border-l-4 bg-slate-50 overflow-hidden" style={{ borderColor: LEVEL_COLORS[d.level] || '#0E7C66' }}>
                    <div className="flex items-start justify-between gap-3 p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><p className="font-semibold text-slate-800 text-sm">{d.name}</p><Badge variant="outline" className="text-[10px]">{d.level}</Badge></div>
                        {d.dimensionDescription && <p className="text-xs text-slate-500 mt-0.5">{d.dimensionDescription}</p>}
                        <p className="text-xs text-slate-500 mt-1">{d.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0"><p className="text-lg font-bold text-slate-900">{d.pct}%</p><p className="text-[10px] text-slate-400">{d.score}/{d.maxScore}</p></div>
                    </div>
                    {d.strengths?.length > 0 && (
                      <div className="px-3 pb-2">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Strengths</p>
                        <ul className="space-y-0.5">{d.strengths.slice(0, 3).map((s: string, j: number) => <li key={j} className="text-xs text-slate-600 flex gap-1.5"><span className="text-emerald-500">+</span><span>{s}</span></li>)}</ul>
                      </div>
                    )}
                    {d.developmentAreas?.length > 0 && (
                      <div className="px-3 pb-3">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-1">Development Areas</p>
                        <ul className="space-y-0.5">{d.developmentAreas.slice(0, 3).map((s: string, j: number) => <li key={j} className="text-xs text-slate-600 flex gap-1.5"><span className="text-amber-500">&rarr;</span><span>{s}</span></li>)}</ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Interpreter section (counsellors & admins only) */}
          {showInterpretation && user?.role !== 'STUDENT' && (
            <div className="rounded-xl border border-teal-200 overflow-hidden">
              <div className="bg-navy px-4 py-3 flex items-center gap-2" style={{ background: '#0F2A43' }}>
                <Sparkles className="w-4 h-4 text-teal-400" />
                <p className="text-sm font-bold text-white">Counselor's Deep-Dive Interpretation</p>
              </div>
              <div className="p-4 bg-slate-50">
                {interpretation ? (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: interpretation }} />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div className="w-4 h-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                    Generating interpretation...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
            This report is based on a self-report psychometric screening instrument and is intended for guidance purposes only. It is not a clinical diagnosis.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{label}</p><p className="text-sm text-slate-700 font-medium truncate">{value}</p></div>
}
