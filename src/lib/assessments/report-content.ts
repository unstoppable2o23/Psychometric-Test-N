// Report content module — loads the rich report content (type profiles,
// intelligence descriptions, stream details, etc.) extracted from the
// original HTML files. Used by the PDF generator to produce reports that
// match the original reference format.
import fs from 'fs'
import path from 'path'

const OUT = path.join(process.cwd(), 'scripts', 'out')
const cache: Record<string, any> = {}
function load(name: string): any {
  if (cache[name]) return cache[name]
  try {
    const p = path.join(OUT, `${name}.json`)
    const data = JSON.parse(fs.readFileSync(p, 'utf8'))
    cache[name] = data
    return data
  } catch { return null }
}

// --- Personality typeData (16 MBTI types) ---
export function getPersonalityTypeData(type: string): any {
  const d = load('personality-typedata')
  return d?.[type] || null
}

// Standard MBTI dichotomy comparison data (from the reference report)
const DICHOTOMIES = [
  {
    pair: 'I', vs: 'E', name: 'Introversion (I) vs. Extraversion (E)',
    desc: 'How we interact with the world and where we direct our energy.',
    left: 'Introversion', right: 'Extraversion',
    leftPts: ['Focus attention inward', 'Enjoy tasks that require concentration', 'Work best on one project at a time', 'Work at a careful, steady pace', 'Consider things fully before speaking'],
    rightPts: ['Focus attention outward', 'Enjoy a variety of tasks', 'Seek out and need other people', 'Work at a rapid pace', 'Need to talk through their ideas'],
  },
  {
    pair: 'S', vs: 'N', name: 'Sensing (S) vs iNtuition (N)',
    desc: 'What kind of information we naturally focus on and remember.',
    left: 'Sensing', right: 'iNtuition',
    leftPts: ['Focus on "what is"', 'Like working with what can be seen and touched', 'Apply past experience to solving problems', 'Need specific and realistic directions', 'Value practical results'],
    rightPts: ['Focus on "what could be"', 'Enjoy theory and speculation', 'Like thinking about the future and possibilities', 'Need to use their imagination', 'Value inspiration'],
  },
  {
    pair: 'T', vs: 'F', name: 'Thinking (T) vs. Feeling (F)',
    desc: 'Make decisions logically and impersonally, or use personal values.',
    left: 'Thinking', right: 'Feeling',
    leftPts: ['Are motivated by achievement', 'Enjoy analyzing problems logically', 'Make fair and unbiased decisions', 'Need to weigh the pros and cons', 'Can be tough negotiators'],
    rightPts: ['Motivated by work that is meaningful', 'Sensitive to how issues affect people', 'Like helping others and being appreciated', 'Need decisions to be congruent with their values', 'Need to work in a friendly environment'],
  },
  {
    pair: 'J', vs: 'P', name: 'Judging (J) vs. Perceiving (P)',
    desc: 'More structured (finalize decisions) or more spontaneous (keep options open).',
    left: 'Judging', right: 'Perceiving',
    leftPts: ['Enjoy work that allows them to make decisions', 'Prefer a predictable work pattern', 'Work towards completing responsibilities before relaxing', 'Like to maintain control of their projects', 'Value structure'],
    rightPts: ['Enjoy flexible and changing work situations', 'Like to respond to problems as they arise', 'Are more satisfied with fewer rules', 'Need to have fun in their work', 'Value flexibility'],
  },
]
export function getDichotomies() { return DICHOTOMIES }

// --- Multiple Intelligence INTEL data ---
export function getIntelData(code: string): any {
  const d = load('multiple-intelligence')
  return d?.INTEL?.[code] || null
}
export function getAllIntel(): Record<string, any> {
  return load('multiple-intelligence')?.INTEL || {}
}

// --- Stream Selector STREAM_DATABASE ---
export function getStreamData(code: string): any {
  const d = load('stream-selector')
  return d?.STREAM_DATABASE?.[code] || null
}
export function getAllStreams(): Record<string, any> {
  return load('stream-selector')?.STREAM_DATABASE || {}
}

// --- Learning Style DESCS + RECS ---
export function getLearningStyleDescs(): Record<string, string> {
  return load('learning-style-report')?.DESCS || {}
}
export function getLearningStyleRecs(): Record<string, any> {
  return load('learning-style-report')?.RECS || {}
}
