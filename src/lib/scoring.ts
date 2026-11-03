// Server-side scoring engine. Computes official psychometric scores from
// stored answers. NEVER exposed to the browser — only the resulting scores
// and interpretations are released to authorised users.

import { NormAssessment, ScoreResult, DimensionDef } from '@/lib/assessments/types'

function levelFromBands(pct: number, bands: DimensionDef['bands']): string {
  let level = bands[0]?.label || 'Low'
  for (const b of bands) {
    if (pct >= b.minPct) level = b.label
  }
  return level
}

function descFromBands(pct: number, bands: DimensionDef['bands']): string {
  let desc = bands[0]?.description || ''
  for (const b of bands) {
    if (pct >= b.minPct) desc = b.description
  }
  return desc
}

// answers: map of question orderIndex -> selected option label
export function scoreAttempt(
  assessment: NormAssessment,
  answers: Record<number, string>,
): ScoreResult {
  switch (assessment.scoringMethod) {
    case 'DOMAIN_STREAM':
      return scoreDomainStream(assessment, answers)
    case 'FORCED_CHOICE_PAIR':
      return scoreForcedChoice(assessment, answers)
    case 'SCORING_MAP':
    default:
      return scoreScoringMap(assessment, answers)
  }
}

// Generic: accumulate per-question scoring maps ------------------------------
function scoreScoringMap(assessment: NormAssessment, answers: Record<number, string>): ScoreResult {
  const totals: Record<string, number> = {}
  for (const dim of assessment.dimensions) totals[dim.code] = 0

  for (const q of assessment.questions) {
    const ans = answers[q.orderIndex]
    if (ans === undefined || ans === null) continue
    const map = q.scoring[ans]
    if (!map) continue
    for (const dimCode of Object.keys(map)) {
      totals[dimCode] = (totals[dimCode] || 0) + map[dimCode]
    }
  }

  const dimensions = assessment.dimensions.map((dim) => {
    const score = totals[dim.code] || 0
    const maxScore = dim.maxScore || 1
    const pct = Math.round((score / maxScore) * 100)
    return {
      code: dim.code, name: dim.name, score, maxScore, pct,
      level: levelFromBands(pct, dim.bands), description: descFromBands(pct, dim.bands),
    }
  })

  const sorted = [...dimensions].sort((a, b) => b.pct - a.pct)
  const top = sorted.slice(0, 3).map((d) => d.code)
  const topDim = sorted[0]
  const recommendation = topDim
    ? `Strongest profile dimension is ${topDim.name} (${topDim.level}).`
    : undefined

  return { dimensions, totalScore: sorted[0]?.score, recommendation, topDimensions: top }
}

// Personality forced-choice: pair E/I, S/N, T/F, J/P -------------------------
function scoreForcedChoice(assessment: NormAssessment, answers: Record<number, string>): ScoreResult {
  const totals: Record<string, number> = {}
  for (const dim of assessment.dimensions) totals[dim.code] = 0
  for (const q of assessment.questions) {
    const ans = answers[q.orderIndex]
    if (ans === undefined) continue
    const map = q.scoring[ans]
    if (!map) continue
    for (const k of Object.keys(map)) totals[k] = (totals[k] || 0) + map[k]
  }
  const pairs: [string, string][] = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']]
  const typeLetters: string[] = []
  const pairResults: { code: string; name: string; score: number; maxScore: number; pct: number; level: string; description: string }[] = []
  for (const [a, b] of pairs) {
    const da = totals[a] || 0
    const db = totals[b] || 0
    const total = da + db || 1
    const winner = da >= db ? a : b
    typeLetters.push(winner)
    // report both letters as dimensions
    for (const code of [a, b]) {
      const dim = assessment.dimensions.find((d) => d.code === code)!
      const score = totals[code] || 0
      const maxScore = dim.maxScore || total
      const pct = Math.round((score / total) * 100)
      pairResults.push({ code, name: dim.name, score, maxScore, pct, level: levelFromBands(pct, dim.bands), description: dim.description })
    }
  }
  const type = typeLetters.join('')
  const typeMap: Record<string, string> = {
    ISTJ: 'The Inspector', ISFJ: 'The Protector', INFJ: 'The Counselor', INTJ: 'The Architect',
    ISTP: 'The Crafter', ISFP: 'The Artist', INFP: 'The Healer', INTP: 'The Logician',
    ESTP: 'The Dynamo', ESFP: 'The Performer', ENFP: 'The Champion', ENTP: 'The Visionary',
    ESTJ: 'The Supervisor', ESFJ: 'The Provider', ENFJ: 'The Teacher', ENTJ: 'The Commander',
  }
  const recommendation = `Personality type: ${type} \u2014 ${typeMap[type] || 'Unique blend'}`
  return { dimensions: pairResults, recommendation, topDimensions: typeLetters }
}

// Stream selector: per-domain aptitude + interest composites ----------------
function scoreDomainStream(assessment: NormAssessment, answers: Record<number, string>): ScoreResult {
  const domains: Record<string, { apt: number; aptCount: number; int: number; intCount: number }> = {}
  for (const dim of assessment.dimensions) domains[dim.code] = { apt: 0, aptCount: 0, int: 0, intCount: 0 }

  for (const q of assessment.questions) {
    const dom = q.streamDomain || q.dimension
    if (!dom || !domains[dom]) continue
    const ans = answers[q.orderIndex]
    if (ans === undefined) continue
    const map = q.scoring[ans]
    if (!map) continue
    const val = map[dom] || 0
    const isInterest = (q.streamType || '').includes('interest')
    if (isInterest) { domains[dom].int += val; domains[dom].intCount++ }
    else { domains[dom].apt += val; domains[dom].aptCount++ }
  }

  const recs = assessment.recommendations || []
  const breakdown = Object.keys(domains).map((code) => {
    const d = domains[code]
    const aptAvg = d.aptCount ? Math.round(d.apt / d.aptCount) : 65
    const intAvg = d.intCount ? Math.round(d.int / d.intCount) : 65
    const composite = Math.round((aptAvg * 0.5) + (intAvg * 0.5))
    const rec = recs.find((r) => r.code === code)
    return {
      code, title: rec?.title || code,
      aptitude: Math.min(Math.max(aptAvg, 20), 98),
      interest: Math.min(Math.max(intAvg, 20), 98),
      composite,
    }
  })
  breakdown.sort((a, b) => b.composite - a.composite)

  const dimensions = breakdown.map((b) => ({
    code: b.code, name: b.title, score: b.composite, maxScore: 100, pct: b.composite,
    level: b.composite >= 75 ? 'High' : b.composite >= 50 ? 'Moderate' : 'Low',
    description: `Aptitude ${b.aptitude} · Interest ${b.interest}`,
  }))

  const top = breakdown[0]
  const recommendation = top
    ? `Recommended stream: ${top.title} (${top.subtitle || top.code}). Composite score ${top.composite}/100.`
    : undefined

  return {
    dimensions, totalScore: top?.composite, recommendation,
    topDimensions: breakdown.slice(0, 2).map((b) => b.code),
    domainBreakdown: breakdown,
  }
}
