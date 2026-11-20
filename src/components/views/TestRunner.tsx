'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Trophy, Star, Sparkles, CheckCircle2, PartyPopper, Zap, Award, Rocket, Target, Flag, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

const MILESTONES = [
  { pct: 25, icon: Zap, label: 'Quarter Completed', msg: 'Great start — 25% done! Keep the momentum going.', color: 'from-blue-400 to-blue-600', ring: 'ring-blue-300' },
  { pct: 50, icon: Star, label: 'Half Completed', msg: "You're halfway there — amazing focus!", color: 'from-amber-400 to-amber-600', ring: 'ring-amber-300' },
  { pct: 75, icon: Rocket, label: 'Three-Quarter Completed', msg: 'Almost done — finish strong!', color: 'from-rose-400 to-rose-600', ring: 'ring-rose-300' },
  { pct: 100, icon: Trophy, label: 'Test Completed', msg: 'You did it — all questions answered!', color: 'from-emerald-400 to-teal-600', ring: 'ring-emerald-300' },
]

export function TestRunner() {
  const token = useApp((s) => s.testToken)!
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [done, setDone] = useState<{ recommendation?: string; reportId?: string } | null>(null)
  const [seenMilestones, setSeenMilestones] = useState<number[]>([])
  const [milestone, setMilestone] = useState<typeof MILESTONES[number] | null>(null)
  const advancingRef = useRef(false)

  const goDashboard = useCallback(() => {
    // Check if this is an anonymous link test — redirect to the anon report page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const anonToken = params.get('anon')
      if (anonToken) {
        window.location.href = `/anon/${anonToken}`
        return
      }
    }
    window.location.href = '/'
  }, [])

  // --- Content Protection: discourage copying of test questions ---
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleCopy = (e: ClipboardEvent) => e.preventDefault()
    const handleSelectStart = (e: Event) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block copy/select shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A' || e.key === 's' || e.key === 'S')) {
        e.preventDefault()
      }
      // Block DevTools shortcuts (deterrent, not absolute)
      if (e.key === 'F12') e.preventDefault()
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) e.preventDefault()
    }
    const handleDrag = (e: DragEvent) => e.preventDefault()
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('selectstart', handleSelectStart)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('dragstart', handleDrag)
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('selectstart', handleSelectStart)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('dragstart', handleDrag)
    }
  }, [])

  const loadQuestion = useCallback(async () => {
    try {
      const s = await api.getTestQuestion(token)
      setState(s)
      setSelected(s.existingAnswer ?? null)
    } catch (e: any) {
      toast.error(e.message)
      goDashboard()
    } finally { setLoading(false) }
  }, [token, goDashboard])

  useEffect(() => { loadQuestion() }, [loadQuestion])

  function fireConfetti() {
    const colors = ['#0E7C66', '#10B981', '#F59E0B', '#0EA5E9', '#EC4899']
    confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 }, colors })
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.5 }, colors }), 250)
    setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.5 }, colors }), 450)
  }

  function checkMilestone(answeredCount: number, total: number) {
    const pct = Math.round((answeredCount / total) * 100)
    for (const m of MILESTONES) {
      if (pct >= m.pct && !seenMilestones.includes(m.pct)) {
        setSeenMilestones((prev) => [...prev, m.pct])
        setMilestone(m)
        fireConfetti()
        setTimeout(() => setMilestone(null), 3000)
        return
      }
    }
  }

  async function selectOption(opt: string) {
    if (advancingRef.current || !state) return
    setSelected(opt)
    advancingRef.current = true
    setAdvancing(true)
    try {
      const res = await api.answerQuestion(token, opt)
      if (res.complete) {
        const result = await api.completeTest(token)
        fireConfetti()
        setTimeout(fireConfetti, 600)
        setDone({ recommendation: result.recommendation, reportId: result.reportId })
      } else {
        setState((prev: any) => ({ ...prev, question: res.question, answeredCount: res.answeredCount, canGoBack: res.canGoBack }))
        setSelected(res.existingAnswer ?? null)
        const answered = res.answeredCount
        checkMilestone(answered, state.assessment.totalQuestions)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      advancingRef.current = false
      setAdvancing(false)
    }
  }

  async function goBack() {
    if (advancingRef.current) return
    setAdvancing(true)
    try {
      const res = await api.backQuestion(token)
      setState((prev: any) => ({ ...prev, question: res.question, answeredCount: res.answeredCount, canGoBack: res.canGoBack }))
      setSelected(res.existingAnswer ?? null)
    } catch (e: any) { toast.error(e.message) }
    finally { setAdvancing(false) }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center bg-gradient-to-br from-slate-50 to-teal-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Preparing your assessment…</p>
        </div>
      </div>
    )
  }

  if (done) {
    // Check if this is an anonymous link test
    const anonToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('anon') : null
    return <CompletionScreen recommendation={done.recommendation} reportId={done.reportId} onViewDashboard={goDashboard} isAnon={!!anonToken} />
  }

  if (!state) return null
  const { question, assessment, answeredCount, canGoBack } = state
  const total = assessment.totalQuestions
  const currentNum = question.number
  // Progress based on questions answered (not just current position)
  const progressPct = Math.round(((currentNum - 1) / total) * 100)

  return (
    <div
      className="min-h-[calc(100vh-3.5rem)] relative overflow-hidden select-none"
      style={{ WebkitUserSelect: 'none', MozUserSelect: 'none', userSelect: 'none' }}
    >
      {/* decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl" />
      </div>

      {/* --- Prominent Progress Bar (top, sticky) --- */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wide">{assessment.shortTitle || assessment.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{progressPct}<span className="text-sm text-slate-400">%</span></span>
            </div>
          </div>
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </motion.div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-slate-500 font-medium">Question {currentNum} of {total}</p>
            <div className="flex items-center gap-1">
              {seenMilestones.includes(25) && <BadgeChip icon={Zap} color="bg-blue-500" label="25%" />}
              {seenMilestones.includes(50) && <BadgeChip icon={Star} color="bg-amber-500" label="50%" />}
              {seenMilestones.includes(75) && <BadgeChip icon={Rocket} color="bg-rose-500" label="75%" />}
              {seenMilestones.includes(100) && <BadgeChip icon={Trophy} color="bg-emerald-500" label="100%" />}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Section indicator */}
        {question.sectionName && (
          <div className="mb-3 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-teal-500" />
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">{question.sectionName}</p>
          </div>
        )}

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.orderIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Card className="border-slate-200 shadow-xl bg-white rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <CardContent className="pt-7 pb-6">
                {/* Question number badge */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 grid place-items-center flex-shrink-0">
                    <span className="text-teal-600 font-bold text-sm">{currentNum}</span>
                  </div>
                  <div className="h-px flex-1 bg-slate-100" />
                  <span className="text-xs text-slate-400 font-medium">{total - currentNum + 1} remaining</span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed mb-6">{question.text}</h2>

                {/* Options */}
                <div className="space-y-2.5">
                  {question.options.map((opt: string, i: number) => {
                    const isSel = selected === opt
                    return (
                      <motion.button
                        key={opt}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => selectOption(opt)}
                        disabled={advancing}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSel ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                        } ${advancing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className={`w-8 h-8 rounded-lg grid place-items-center text-xs font-bold flex-shrink-0 transition-colors ${isSel ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65 + i)}</span>
                        <span className="text-sm sm:text-base text-slate-800 font-medium flex-1">{opt}</span>
                        {isSel && <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Sequential navigation hint */}
                {!selected && !advancing && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">Select an answer above to continue to the next question</p>
                  </div>
                )}
                {selected && !advancing && (
                  <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 font-medium">Answer saved — proceeding to next question…</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation controls */}
        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={!canGoBack || advancing} className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Content protected</span>
          </div>
          <div className="w-20" />
        </div>
      </div>

      {/* Milestone celebration popup */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="fixed inset-0 z-50 grid place-items-center pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl px-10 py-8 text-center border-4 border-amber-300 max-w-sm">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${milestone.color} grid place-items-center mx-auto mb-3 shadow-lg`}>
                <milestone.icon className="w-9 h-9 text-white" />
              </div>
              <p className="text-xl font-extrabold text-slate-900">{milestone.label}</p>
              <p className="text-sm text-slate-600 mt-1">{milestone.msg}</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${milestone.color} rounded-full`} style={{ width: `${milestone.pct}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-700">{milestone.pct}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CompletionScreen({ recommendation, reportId, onViewDashboard, isAnon }: { recommendation?: string; reportId?: string; onViewDashboard: () => void; isAnon?: boolean }) {
  const setView = useApp((s) => s.setView)
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center px-4 relative overflow-hidden bg-gradient-to-br from-slate-50 to-teal-50/30">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-amber-100/30 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg w-full">
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur overflow-hidden rounded-2xl">
          <div className="h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400" />
          <CardContent className="pt-10 pb-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 grid place-items-center mx-auto mb-4 shadow-lg">
              <PartyPopper className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-slate-900">All Done!</h1>
            <p className="text-slate-600 mt-2">You completed the assessment. Your responses have been securely submitted and scored on the server.</p>

            {/* Achievement badges */}
            <div className="mt-6 grid grid-cols-4 gap-2">
              {MILESTONES.map((m, i) => (
                <motion.div key={m.pct} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex flex-col items-center gap-1.5">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} grid place-items-center shadow-md`}>
                    <m.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{m.label.replace(' Completed', '')}</span>
                </motion.div>
              ))}
            </div>

            {recommendation && (
              <div className="mt-6 px-4 py-3 rounded-xl bg-teal-50 border border-teal-200 text-left">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1">Your result</p>
                <p className="text-sm text-slate-700">{recommendation}</p>
              </div>
            )}

            <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <p className="text-xs text-slate-500">{isAnon ? 'Click below to view your detailed report.' : 'Your detailed graphical report has been generated on the server. Your administrator can unlock it for you to view and download as a professional A4 PDF.'}</p>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={onViewDashboard} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-12 text-base">
                {isAnon ? 'View My Report' : 'Back to Dashboard'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function BadgeChip({ icon: Icon, color, label }: { icon: any; color: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${color} text-white text-[10px] font-bold shadow-sm`}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  )
}
