// Assessment loader: converts the extracted JSON (from scripts/out/) into the
// normalized NormAssessment[] format used by the scoring engine & seed logic.
// Every question's scoring map is built here so the scoring engine can be
// fully generic. Original questions, options and scoring methodology are
// preserved exactly from the source HTML files.

import fs from 'fs'
import path from 'path'
import { NormAssessment, NormQuestion, DimensionDef, QuestionType } from './types'

const OUT = path.join(process.cwd(), 'scripts', 'out')
const cache: Record<string, any> = {}
const load = (slug: string): any => {
  if (cache[slug]) return cache[slug]
  const p = path.join(OUT, `${slug}.json`)
  const data = JSON.parse(fs.readFileSync(p, 'utf8'))
  cache[slug] = data
  return data
}

// -- Likert helpers ----------------------------------------------------------
const LIKERT5 = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
const LIKERT7 = ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree']

function likertScoring(opts: string[], dim: string): Record<string, Record<string, number>> {
  const m: Record<string, Record<string, number>> = {}
  opts.forEach((label, i) => { m[label] = { [dim]: i + 1 } })
  return m
}

function stdBands(): DimensionDef['bands'] {
  return [
    { label: 'Low', minPct: 0, description: 'This area is currently a relative weakness; focused development can build it over time.' },
    { label: 'Moderate', minPct: 40, description: 'A developing area with some natural inclination; can be strengthened with practice.' },
    { label: 'High', minPct: 70, description: 'A clear strength that the individual naturally gravitates towards and performs well in.' },
  ]
}

// ============================================================================
// 1. LEARNING STYLE  (5-point Likert, 64 questions, 4 categories)
// ============================================================================
function learningStyle(): NormAssessment {
  const d = load('learning-style')
  const cats: { code: string; name: string; group: string }[] = (d.CATS || []).map((c: any) => {
    if (typeof c === 'string') return { code: c, name: c, group: '' }
    const code = c.n || c.code || c.key || c.id || c.name
    return { code, name: c.n || c.name || c.title || code, group: c.type || '' }
  })
  const dims: DimensionDef[] = cats.map((c) => ({
    code: c.code, name: c.name, description: `Learning preference (${c.group || 'Style'}): ${c.name}.`,
    maxScore: 0, bands: stdBands(),
  }))
  const questions: NormQuestion[] = d.QUESTIONS.map((q: any, i: number) => {
    const code = q.c
    const opts = d.LIKERT || LIKERT5
    return {
      orderIndex: i, sectionName: 'Learning Style', text: q.t,
      questionType: 'LIKERT5' as QuestionType, options: opts, dimension: code,
      scoring: likertScoring(opts, code), isReverse: false,
    }
  })
  // maxScore per dimension = count * 5
  dims.forEach((dim) => { dim.maxScore = questions.filter((q) => q.dimension === dim.code).length * 5 })
  return {
    slug: 'learning-style', title: 'Discover Your Learning Style', shortTitle: 'Learning Style',
    description: 'Identifies your preferred way of absorbing, processing and retaining new information across four learning modalities.',
    purpose: 'To help students understand how they learn best so they can study more effectively and choose complementary learning strategies.',
    targetPopulation: 'Students of all ages; particularly useful for secondary and senior secondary students.',
    instructions: 'Read each statement and honestly rate how much it describes you. There are no right or wrong answers — choose the response that feels most true for you.',
    estimatedMinutes: 10, category: 'LEARNING', scoringMethod: 'SCORING_MAP', questions, dimensions: dims,
  }
}

// ============================================================================
// 2. PERSONALITY  (forced-choice pairs, 36 questions, MBTI-style 8 letters)
// ============================================================================
function personality(): NormAssessment {
  const d = load('personality')
  const dims: DimensionDef[] = [
    { code: 'E', name: 'Extraversion', description: 'Energy directed outward; sociable, action-oriented.', maxScore: 0, bands: stdBands() },
    { code: 'I', name: 'Introversion', description: 'Energy directed inward; reflective, depth-oriented.', maxScore: 0, bands: stdBands() },
    { code: 'S', name: 'Sensing', description: 'Trusts concrete facts, observation and detail.', maxScore: 0, bands: stdBands() },
    { code: 'N', name: 'Intuition', description: 'Trusts patterns, meaning and future possibilities.', maxScore: 0, bands: stdBands() },
    { code: 'T', name: 'Thinking', description: 'Decides via logic and objective analysis.', maxScore: 0, bands: stdBands() },
    { code: 'F', name: 'Feeling', description: 'Decides via values and impact on people.', maxScore: 0, bands: stdBands() },
    { code: 'J', name: 'Judging', description: 'Prefers structure, planning and closure.', maxScore: 0, bands: stdBands() },
    { code: 'P', name: 'Perceiving', description: 'Prefers flexibility, spontaneity and options.', maxScore: 0, bands: stdBands() },
  ]
  const questions: NormQuestion[] = d.QUESTIONS.map((q: any, i: number) => {
    const pairs: { text: string; val: string }[] = []
    for (const k of ['a', 'b', 'c', 'd']) {
      if (q[k] !== undefined && q[k + 'v'] !== undefined) pairs.push({ text: q[k], val: q[k + 'v'] })
    }
    const options = pairs.map((p) => p.text)
    const scoring: Record<string, Record<string, number>> = {}
    pairs.forEach((p) => { scoring[p.text] = { [p.val]: 1 } })
    return {
      orderIndex: i, sectionName: q.s, text: q.t,
      questionType: 'FORCED_CHOICE' as QuestionType, options, dimension: q.s,
      scoring, isReverse: false,
    }
  })
  dims.forEach((dim) => { dim.maxScore = questions.filter((q) => Object.values(q.scoring).some((m) => dim.code in m)).length })
  return {
    slug: 'personality', title: 'Personality Type Assessment', shortTitle: 'Personality',
    description: 'A forced-choice personality assessment mapping preferences across four dichotomies (E/I, S/N, T/F, J/P) in the MBTI tradition.',
    purpose: 'To reveal natural personality preferences that inform communication style, work approach and compatible career environments.',
    targetPopulation: 'Students aged 14+ and adults.',
    instructions: 'For each question you will see two statements. Choose the one that describes you MORE naturally — even if both sometimes apply. Go with your first instinct.',
    estimatedMinutes: 12, category: 'PERSONALITY', scoringMethod: 'FORCED_CHOICE_PAIR', questions, dimensions: dims,
  }
}

// ============================================================================
// 3. MULTIPLE INTELLIGENCE  (7-point Likert, 54 questions, 9 intelligences)
// ============================================================================
function multipleIntelligence(): NormAssessment {
  const d = load('multiple-intelligence')
  const intel: Record<string, any> = d.INTEL || {}
  const scale = d.SCALE || LIKERT7
  const dims: DimensionDef[] = Object.keys(intel).map((code) => ({
    code, name: intel[code].name || code, description: intel[code].desc || '',
    maxScore: 0, bands: stdBands(),
    strengths: intel[code].strengths, developmentAreas: intel[code].challenges,
  }))
  const questions: NormQuestion[] = d.QUESTIONS.map((q: any, i: number) => {
    const code = q.c
    const opts = scale
    return {
      orderIndex: i, sectionName: 'Multiple Intelligence', text: q.t,
      questionType: 'LIKERT7' as QuestionType, options: opts, dimension: code,
      scoring: likertScoring(opts, code), isReverse: false,
    }
  })
  dims.forEach((dim) => { dim.maxScore = questions.filter((q) => q.dimension === dim.code).length * 7 })
  return {
    slug: 'multiple-intelligence', title: 'Multiple Intelligence Assessment', shortTitle: 'Multiple Intelligence',
    description: 'Based on Howard Gardner\u2019s theory of multiple intelligences, this assessment identifies your strongest intelligence domains across nine areas.',
    purpose: 'To help students discover their unique intellectual strengths beyond traditional academic ability and align learning/careers accordingly.',
    targetPopulation: 'Students aged 12+ and adults.',
    instructions: 'Rate how much each statement describes you on the 7-point scale. Be honest — every intelligence is valuable, so there are no better or worse results.',
    estimatedMinutes: 12, category: 'INTELLIGENCE', scoringMethod: 'SCORING_MAP', questions, dimensions: dims,
  }
}

// ============================================================================
// 4-6. BRANCH SELECTORS  (5-point Likert; Humanities 76, Engineering 56, Commerce 76)
// ============================================================================
function branchSelector(slug: string, title: string, shortTitle: string, field: string, pop: string, desc: string): NormAssessment {
  const d = load(slug)
  const scale = d.LIKERT || LIKERT5
  const cats: string[] = []
  d.QUESTIONS.forEach((q: any) => { if (q.c && !cats.includes(q.c)) cats.push(q.c) })
  const dims: DimensionDef[] = cats.map((c) => ({
    code: c, name: c, description: `Specialisation area within ${field}: ${c}.`,
    maxScore: 0, bands: stdBands(),
  }))
  const questions: NormQuestion[] = d.QUESTIONS.map((q: any, i: number) => {
    const code = q.c
    return {
      orderIndex: i, sectionName: shortTitle, text: q.t,
      questionType: 'LIKERT5' as QuestionType, options: scale, dimension: code,
      scoring: likertScoring(scale, code), isReverse: false,
    }
  })
  dims.forEach((dim) => { dim.maxScore = questions.filter((q) => q.dimension === dim.code).length * 5 })
  return {
    slug, title, shortTitle,
    description: desc,
    purpose: `To identify the ${field} specialisation areas that best match the student\u2019s interests and aptitudes, supporting an informed branch choice.`,
    targetPopulation: pop,
    instructions: 'Rate how strongly each statement reflects your feelings. Answer honestly — your genuine interests will point to your best-fit specialisation.',
    estimatedMinutes: Math.max(8, Math.round(d.QUESTIONS.length / 8)),
    category: 'BRANCH', scoringMethod: 'SCORING_MAP', questions, dimensions: dims,
  }
}

// ============================================================================
// 7. STREAM SELECTOR  (76 questions, domain-based aptitude+interest, 4 streams)
// ============================================================================
function streamSelector(): NormAssessment {
  const d = load('stream-selector')
  const db: Record<string, any> = d.STREAM_DATABASE || {}
  const streamMeta: DimensionDef[] = Object.keys(db).map((code) => ({
    code, name: db[code].title || code, description: db[code].description || '', maxScore: 100, bands: stdBands(),
  }))
  const recs = Object.keys(db).map((code) => ({
    code, title: db[code].title, subtitle: db[code].subtitle || '', description: db[code].description || '',
  }))
  let gi = 0
  const questions: NormQuestion[] = []
  d.TEST_SECTIONS.forEach((sec: any) => {
    sec.questions.forEach((q: any) => {
      const opts: string[] = q.options
      const isReverse = q.type === 'interest_reverse'
      const scoring: Record<string, Record<string, number>> = {}
      if (opts.length === 3) {
        // Yes(0)=100, Not sure(2)=50, No(1)=10; reverse: 110-val
        opts.forEach((label, idx) => {
          let v = idx === 0 ? 100 : idx === 2 ? 50 : 10
          if (isReverse) v = 110 - v
          scoring[label] = { [q.domain]: v }
        })
      } else {
        // MCQ: idx 0/1 = 90, idx 2/3 = 30
        opts.forEach((label, idx) => { scoring[label] = { [q.domain]: idx < 2 ? 90 : 30 } })
      }
      questions.push({
        orderIndex: gi++, sectionId: sec.id || sec.name, sectionName: sec.name || sec.title,
        text: q.text, questionType: (opts.length === 3 ? 'YES_NO_MAYBE' : 'MCQ') as QuestionType,
        options: opts, dimension: q.domain, scoring, isReverse,
        streamDomain: q.domain, streamType: q.type,
      })
    })
  })
  return {
    slug: 'stream-selector', title: 'Discover Stream Selector Test', shortTitle: 'Stream Selector',
    description: 'A 76-question diagnostic assessment combining interest and aptitude items to recommend the best-fit academic stream after Class 10 (Science-Maths, Science-Bio, Commerce or Humanities).',
    purpose: 'To help Class 10 students make an informed stream choice by balancing what they enjoy with what they are naturally suited to.',
    targetPopulation: 'Class 10 students choosing their academic stream.',
    instructions: 'Answer every question honestly. Some ask what you enjoy; others test logic, data or verbal skills. There are no right or wrong answers for interest questions — choose what feels truest to you.',
    estimatedMinutes: 25, category: 'STREAM', scoringMethod: 'DOMAIN_STREAM', questions, dimensions: streamMeta, recommendations: recs,
  }
}

// ============================================================================
// 8. IDEAL CAREER  (182 questions across 7 sections; Big Five + RIASEC + motivators)
// ============================================================================
function idealCareer(): NormAssessment {
  const d = load('ideal-career')
  const bank: Record<string, any[]> = d.questionBank || {}
  const dims: DimensionDef[] = [
    // Big Five
    { code: 'bigFive.openness', name: 'Openness', description: 'Curiosity, imagination and openness to new experiences.', maxScore: 0, bands: stdBands() },
    { code: 'bigFive.conscientiousness', name: 'Conscientiousness', description: 'Organisation, dependability and self-discipline.', maxScore: 0, bands: stdBands() },
    { code: 'bigFive.extraversion', name: 'Extraversion', description: 'Sociability, energy and positive emotion.', maxScore: 0, bands: stdBands() },
    { code: 'bigFive.agreeableness', name: 'Agreeableness', description: 'Cooperation, warmth and concern for others.', maxScore: 0, bands: stdBands() },
    { code: 'bigFive.stability', name: 'Emotional Stability', description: 'Resilience and emotional calmness.', maxScore: 0, bands: stdBands() },
    // RIASEC
    { code: 'riasec.R', name: 'Realistic', description: 'Practical, hands-on, mechanical and physical activities.', maxScore: 0, bands: stdBands() },
    { code: 'riasec.I', name: 'Investigative', description: 'Analytical, scientific and research-oriented activities.', maxScore: 0, bands: stdBands() },
    { code: 'riasec.A', name: 'Artistic', description: 'Creative, expressive and aesthetic activities.', maxScore: 0, bands: stdBands() },
    { code: 'riasec.S', name: 'Social', description: 'Helping, teaching and people-oriented activities.', maxScore: 0, bands: stdBands() },
    { code: 'riasec.E', name: 'Enterprising', description: 'Leading, persuading and business-oriented activities.', maxScore: 0, bands: stdBands() },
    { code: 'riasec.C', name: 'Conventional', description: 'Organised, detail-oriented and clerical activities.', maxScore: 0, bands: stdBands() },
    // Motivators
    { code: 'motivator.money', name: 'Money & Salary', description: 'Importance of high earnings.', maxScore: 0, bands: stdBands() },
    { code: 'motivator.respect', name: 'Respect & Prestige', description: 'Importance of social standing.', maxScore: 0, bands: stdBands() },
    { code: 'motivator.freedom', name: 'Work Freedom', description: 'Importance of autonomy.', maxScore: 0, bands: stdBands() },
    { code: 'motivator.stability', name: 'Job Security', description: 'Importance of a permanent, safe job.', maxScore: 0, bands: stdBands() },
    { code: 'motivator.variety', name: 'Variety', description: 'Importance of diverse tasks.', maxScore: 0, bands: stdBands() },
    { code: 'motivator.leisure', name: 'Personal Time', description: 'Importance of time for family/hobbies.', maxScore: 0, bands: stdBands() },
  ]
  const dimsByCode: Record<string, DimensionDef> = Object.fromEntries(dims.map((x) => [x.code, x]))
  const sectionNames: Record<string, string> = (d.sections || []).reduce((acc: any, s: any) => { acc[String(s.id)] = s.name; return acc }, {})
  let gi = 0
  const questions: NormQuestion[] = []
  Object.keys(bank).sort((a, b) => Number(a) - Number(b)).forEach((secId) => {
    bank[secId].forEach((q: any) => {
      // flatten q.scoring into { optionLabel: { dimCode: pts } }
      const scoring: Record<string, Record<string, number>> = {}
      const sc = q.scoring || {}
      if (sc.bigFive) {
        for (const trait of Object.keys(sc.bigFive)) {
          const map = sc.bigFive[trait]
          for (const opt of Object.keys(map)) {
            scoring[opt] = scoring[opt] || {}
            scoring[opt][`bigFive.${trait}`] = map[opt]
          }
        }
      }
      if (sc.riasec) {
        for (const letter of Object.keys(sc.riasec)) {
          const map = sc.riasec[letter]
          for (const opt of Object.keys(map)) {
            scoring[opt] = scoring[opt] || {}
            scoring[opt][`riasec.${letter}`] = map[opt]
          }
        }
      }
      if (sc.values) {
        // motivator question: sc.motivator holds the motivator name
        const m = sc.motivator
        for (const opt of Object.keys(sc.values)) {
          scoring[opt] = scoring[opt] || {}
          scoring[opt][`motivator.${m}`] = sc.values[opt]
        }
      }
      const qtype: QuestionType = q.options.length === 2 ? 'YES_NO' : q.options.length === 3 ? 'YES_NO_MAYBE' : 'MCQ'
      questions.push({
        orderIndex: gi++, sectionId: secId, sectionName: sectionNames[secId] || `Section ${secId}`,
        text: q.text, questionType: qtype, options: q.options, dimension: Object.keys(scoring).length ? Object.keys(scoring[Object.keys(scoring)[0]])[0] : undefined,
        scoring, isReverse: false,
      })
    })
  })
  // compute maxScore per dimension by scanning scoring maps
  for (const dim of dims) {
    let mx = 0
    for (const q of questions) {
      for (const opt of Object.keys(q.scoring)) {
        const v = q.scoring[opt][dim.code]
        if (v !== undefined) mx = Math.max(mx, v)
      }
    }
    // maxScore = sum of best possible option score across questions touching this dim
    let total = 0
    for (const q of questions) {
      let best = 0
      for (const opt of Object.keys(q.scoring)) {
        const v = q.scoring[opt][dim.code]
        if (v !== undefined && v > best) best = v
      }
      total += best
    }
    dim.maxScore = total || mx
    void dimsByCode
  }
  return {
    slug: 'ideal-career', title: 'Ideal Career Assessment', shortTitle: 'Ideal Career',
    description: 'A comprehensive 182-question assessment combining Big Five personality traits, Holland RIASEC vocational interests and career motivators to recommend ideal career paths.',
    purpose: 'To integrate personality, interest and values data into holistic career guidance aligned with the student\u2019s natural profile.',
    targetPopulation: 'Students aged 15+ and adults exploring career direction.',
    instructions: 'Answer each question spontaneously. The first part uses Yes/No; later parts ask how much you would enjoy specific careers or how important each motivator is to you.',
    estimatedMinutes: 25, category: 'CAREER', scoringMethod: 'SCORING_MAP', questions, dimensions: dims,
  }
}

// ============================================================================
// 9. MULTI-DIMENSIONAL TEST  (60 questions, 5 sections, per-class question banks)
// ============================================================================
const MD_SECTION_OPTIONS: Record<string, string[]> = {
  'Natural Abilities': ['Not at all', 'Barely', 'Somewhat', 'Fairly well', 'Extremely easily'],
  'Interests': ['I hate it', 'I dislike it', "I don't mind it", 'I like it', 'I absolutely love it'],
  'Personality': ['Not me at all', 'Rarely me', 'Sometimes me', 'Often me', 'Exactly me'],
  'Career Motivators': ['Not important', 'Slightly important', 'Moderately important', 'Very important', 'My top priority'],
  'Learning Styles': ['Never works', 'Rarely works', 'Sometimes works', 'Often works', 'Always works best'],
}

function multiDimensional(): NormAssessment {
  const d = load('multi-dimensional')
  // Use the first class question bank as the canonical question set
  const bank: Record<string, any[]> = d.questionBank || {}
  const firstClass = Object.keys(bank)[0]
  const qs = bank[firstClass] || []
  const cats: string[] = []
  qs.forEach((q: any) => { if (q.c && !cats.includes(q.c)) cats.push(q.c) })
  const dims: DimensionDef[] = cats.map((c) => ({
    code: c, name: c, description: `Profile dimension: ${c}.`, maxScore: 0, bands: stdBands(),
  }))
  const questions: NormQuestion[] = qs.map((q: any, i: number) => {
    const opts = MD_SECTION_OPTIONS[q.sec] || MD_SECTION_OPTIONS['Natural Abilities']
    return {
      orderIndex: i, sectionName: q.sec, text: q.t,
      questionType: 'LIKERT5' as QuestionType, options: opts, dimension: q.c,
      scoring: likertScoring(opts, q.c), isReverse: false,
    }
  })
  dims.forEach((dim) => { dim.maxScore = questions.filter((q) => q.dimension === dim.code).length * 5 })
  return {
    slug: 'multi-dimensional', title: 'Multi-Dimensional Psychometric Test', shortTitle: 'Multi-Dimensional',
    description: 'A single comprehensive assessment evaluating five dimensions — Natural Abilities, Interests, Personality, Career Motivators and Learning Styles — to produce a full psychometric profile.',
    purpose: 'To provide a 360\u00b0 psychometric snapshot in one sitting, combining the key dimensions that inform academic and career guidance.',
    targetPopulation: 'Students from Class 8 through postgraduation; question banks adapt by grade.',
    instructions: 'Each section uses a tailored 5-point response scale. Pick the option that best reflects you. The assessment flows through five short sections of 12 questions each.',
    estimatedMinutes: 15, category: 'MULTI', scoringMethod: 'SCORING_MAP', questions, dimensions: dims, multiClass: true,
  }
}

// ============================================================================
// Export all
// ============================================================================
export const ASSESSMENTS: NormAssessment[] = [
  learningStyle(),
  personality(),
  multipleIntelligence(),
  branchSelector('humanities-branch', 'Humanities Branch Selector', 'Humanities Branch', 'Humanities', 'Class 11-12 students choosing a Humanities specialisation.', 'Identifies the humanities specialisation areas (teaching, law, journalism, psychology, etc.) that best match the student\u2019s interests.'),
  branchSelector('engineering-branch', 'Engineering Branch Selector', 'Engineering Branch', 'Engineering', 'Class 12 / engineering aspirants choosing an engineering branch.', 'Identifies the engineering branches (software, mechanical, civil, electrical, etc.) that best match the student\u2019s interests and aptitudes.'),
  branchSelector('commerce-branch', 'Commerce Branch Selector', 'Commerce Branch', 'Commerce', 'Class 11-12 students choosing a Commerce specialisation.', 'Identifies the commerce specialisation areas (accounts, finance, analytics, etc.) that best match the student\u2019s interests.'),
  streamSelector(),
  idealCareer(),
  multiDimensional(),
]

export function getAssessment(slug: string): NormAssessment | undefined {
  return ASSESSMENTS.find((a) => a.slug === slug)
}
