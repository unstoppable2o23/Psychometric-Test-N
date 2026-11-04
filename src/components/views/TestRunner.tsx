'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, Trophy, Star, Sparkles, CheckCircle2, PartyPopper, Zap, Award, Rocket } from 'lucide-react'
import { toast } from 'sonner'

const MILESTONES = [
  { pct: 25, icon: Zap, label: 'Quarter Way!', msg: 'Great start — keep the momentum!' },
  { pct: 50, icon: Star, label: 'Halfway Hero!', msg: "You're halfway there — amazing focus!" },
  { pct: 75, icon: Rocket, label: 'Final Stretch!', msg: 'Almost done — finish strong!' },
  { pct: 100, icon: Trophy, label: 'Complete!', msg: 'You did it — all questions answered!' },
]

export function TestRunner() {
  const token = useApp((s) => s.testToken)!
  const setView = useApp((s) => s.setView)
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [done, setDone] = useState<{ recommendation?: string } | null>(null)
  const [seenMilestones, setSeenMilestones] = useState<number[]>([])
  const [milestone, setMilestone] = useState<typeof MILESTONES[number] | null>(null)
  const advancingRef = useRef(false)

  const loadQuestion = useCallback(async () => {
    try {
      const s = await api.getTestQuestion(token)
      setState(s)
      setSelected(s.existingAnswer ?? null)
    } catch (e: any) {
      toast.error(e.message)
      setView('student-dashboard')
    } finally { setLoading(false) }
  }, [token, setView])

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
        setTimeout(() => setMilestone(null), 2800)
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
        // last question answered — call complete
        const result = await api.completeTest(token)
        fireConfetti()
        setTimeout(fireConfetti, 600)
        setDone({ recommendation: result.recommendation })
      } else {
        // Merge: keep assessment from initial load, update question + progress
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
      <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Preparing your assessment…</p>
        </div>
      </div>
    )
  }

  if (done) {
    return <CompletionScreen recommendation={done.recommendation} onViewDashboard={() => setView('student-dashboard')} />
  }

  if (!state) return null
  const { question, assessment, answeredCount, canGoBack } = state
  const total = assessment.totalQuestions
  const pct = Math.round(((question.number) / total) * 100)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
      {/* decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Progress header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">{assessment.shortTitle || assessment.title}</p>
              <p className="text-sm text-slate-500">Question {question.number} of {total}</p>
            </div>
            <div className="flex items-center gap-2">
              {seenMilestones.includes(25) && <Badge25 />}
              {seenMilestones.includes(50) && <Badge50 />}
              {seenMilestones.includes(75) && <Badge75 />}
            </div>
          </div>
          <Progress value={pct} className="h-2.5" />
          {question.sectionName && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> {question.sectionName}</p>
          )}
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.orderIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Card className="border-slate-200 shadow-lg bg-white/95 backdrop-blur">
              <CardContent className="pt-7 pb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug mb-6">{question.text}</h2>
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
                        <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold flex-shrink-0 ${isSel ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{String.fromCharCode(65 + i)}</span>
                        <span className="text-sm sm:text-base text-slate-800 font-medium flex-1">{opt}</span>
                        {isSel && <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />}
                      </motion.button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" onClick={goBack} disabled={!canGoBack || advancing} className="text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pick an answer to continue automatically
          </p>
          <div className="w-20" />
        </div>
      </div>

      {/* Milestone popup */}
      <AnimatePresence>
        {milestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 grid place-items-center pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl px-10 py-8 text-center border-4 border-amber-300">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center mx-auto mb-3">
                <milestone.icon className="w-9 h-9 text-white" />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{milestone.label}</p>
              <p className="text-sm text-slate-600 mt-1">{milestone.msg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CompletionScreen({ recommendation, onViewDashboard }: { recommendation?: string; onViewDashboard: () => void }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-teal-100/60 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-amber-100/40 rounded-full blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-lg w-full">
        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400" />
          <CardContent className="pt-10 pb-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 grid place-items-center mx-auto mb-4 shadow-lg">
              <PartyPopper className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-slate-900">All Done! 🎉</h1>
            <p className="text-slate-600 mt-2">You completed the assessment. Your responses have been securely submitted and scored on the server.</p>

            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              {[Trophy, Star, Award].map((Icon, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="flex items-center gap-2 px-3 py-2 rounded-full bg-amber-50 border border-amber-200">
                  <Icon className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700">{['Participation', 'Completion', 'Focus'][i]}</span>
                </motion.div>
              ))}
            </div>

            {recommendation && (
              <div className="mt-6 px-4 py-3 rounded-xl bg-teal-50 border border-teal-200 text-left">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-1">Your result</p>
                <p className="text-sm text-slate-700">{recommendation}</p>
              </div>
            )}

            <div className="mt-6 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <p className="text-xs text-slate-500">Your detailed report has been generated and is available to your administrator and authorised counsellors. Report access for students will be enabled through payment authorisation in a future update.</p>
            </div>

            <Button onClick={onViewDashboard} className="mt-7 bg-teal-600 hover:bg-teal-700 text-white w-full h-12 text-base">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function Badge25() { return <BadgeMini icon={Zap} color="bg-blue-500" /> }
function Badge50() { return <BadgeMini icon={Star} color="bg-amber-500" /> }
function Badge75() { return <BadgeMini icon={Rocket} color="bg-rose-500" /> }
function BadgeMini({ icon: Icon, color }: { icon: any; color: string }) {
  return <span className={`w-6 h-6 rounded-full ${color} grid place-items-center shadow-sm`}><Icon className="w-3.5 h-3.5 text-white" /></span>
}
