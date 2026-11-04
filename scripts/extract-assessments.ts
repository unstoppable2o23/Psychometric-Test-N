/**
 * Extraction script: reads each psychometric HTML file, evaluates its
 * embedded <script> blocks in a sandboxed VM with stubbed browser globals,
 * then dumps the key data variables (QUESTIONS, CATS, TEST_SECTIONS,
 * sections, questionBank, STREAM_DATABASE, etc.) to structured JSON files.
 *
 * Run: bun run scripts/extract-assessments.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import vm from 'vm'

const UPLOAD_DIR = '/home/z/my-project/upload'
const OUT_DIR = '/home/z/my-project/scripts/out'
mkdirSync(OUT_DIR, { recursive: true })

const TARGETS: { file: string; vars: string[]; slug: string }[] = [
  { file: 'Learning Style.html', slug: 'learning-style', vars: ['QUESTIONS', 'CATS', 'LIKERT'] },
  { file: 'Personality.html', slug: 'personality', vars: ['QUESTIONS', 'CATS', 'LIKERT'] },
  { file: 'Multiple Intelligence Assessment.html', slug: 'multiple-intelligence', vars: ['QUESTIONS', 'INTEL', 'CLUSTER_MAP', 'SALARY_MAP', 'SCALE', 'eiTraits', 'eiRecs'] },
  { file: 'Humanities branch Selector.html', slug: 'humanities-branch', vars: ['QUESTIONS', 'CATS', 'LIKERT'] },
  { file: 'Engineering Branch Selector.html', slug: 'engineering-branch', vars: ['QUESTIONS', 'CATS', 'LIKERT'] },
  { file: 'Commerce Branch Selector.html', slug: 'commerce-branch', vars: ['QUESTIONS', 'CATS', 'LIKERT', 'FIN'] },
  { file: 'stream selector test.html', slug: 'stream-selector', vars: ['TEST_SECTIONS', 'STREAM_DATABASE'] },
  { file: 'ideal career new.html', slug: 'ideal-career', vars: ['sections', 'questionBank', 'RIASEC', 'BIGFIVE', 'MOTIVATORS'] },
  { file: 'Multi dimensional test (One test for all).html', slug: 'multi-dimensional', vars: ['questionBank', 'DIMS', 'SECTIONS'] },
]

function makeSandbox() {
  const noop = () => {}
  const fakeEl: any = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'style') return {}
      if (prop === 'classList') return { add: noop, remove: noop, toggle: noop, contains: () => false }
      if (prop === 'addEventListener' || prop === 'removeEventListener') return noop
      if (prop === 'appendChild' || prop === 'append' || prop === 'prepend') return noop
      if (prop === 'innerHTML' || prop === 'textContent' || prop === 'innerText') return ''
      if (prop === 'value') return ''
      if (prop === 'checked') return false
      if (prop === 'dataset') return {}
      if (prop === 'children' || prop === 'childNodes') return []
      if (prop === 'length') return 0
      if (prop === 'setAttribute' || prop === 'removeAttribute') return noop
      if (prop === 'appendChild') return noop
      return noop
    },
    set() { return true },
  })
  const fakeDoc: any = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'createElement' || prop === 'getElementById' || prop === 'querySelector') return () => fakeEl
      if (prop === 'querySelectorAll' || prop === 'getElementsByTagName' || prop === 'getElementsByClassName') return () => []
      if (prop === 'addEventListener') return noop
      if (prop === 'body' || prop === 'documentElement' || prop === 'head') return fakeEl
      if (prop === 'title') return ''
      if (prop === 'createTextNode') return () => fakeEl
      return noop
    },
  })
  const sandbox: any = {
    document: fakeDoc,
    window: {},
    console,
    confetti: noop,
    Chart: function () { return {} },
    $: () => fakeEl,
    jQuery: () => fakeEl,
    tailwind: { config: noop },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    setTimeout: noop, setInterval: noop, clearTimeout: noop, clearInterval: noop,
    alert: noop, prompt: () => null, confirm: () => true,
    location: { href: '', reload: noop, search: '' },
    history: { pushState: noop, replaceState: noop },
    URLSearchParams: function () { return { get: () => null, has: () => false } },
    Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set, Symbol, Promise,
    parseInt, parseFloat, isNaN, isFinite,
    undefined, NaN, Infinity,
  }
  sandbox.window.document = fakeDoc
  sandbox.window.location = sandbox.location
  sandbox.window.localStorage = sandbox.localStorage
  sandbox.window.sessionStorage = sandbox.sessionStorage
  sandbox.self = sandbox
  sandbox.globalThis = sandbox
  sandbox.top = sandbox
  sandbox.HTMLElement = function () {}
  sandbox.Event = function () {}
  sandbox.CustomEvent = function () {}
  sandbox.Node = { ELEMENT_NODE: 1 }
  return sandbox
}

function extractScripts(html: string): string[] {
  const scripts: string[] = []
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]
    if (/src\s*=/i.test(tag.slice(0, tag.indexOf('>')))) continue
    if (m[1].trim()) scripts.push(m[1])
  }
  return scripts
}

// Convert top-level const/let to var so declarations attach to the global
// object and persist across try/catch-wrapped blocks. Crude but effective for
// data-only declarations in these assessment files.
function toVar(src: string): string {
  return src.replace(/(^|\n)([ \t]*)(const|let)\s+/g, (_m, pre, indent) => `${pre}${indent}var `)
}

// Bracket-matching extractor: finds `const/let/var NAME = <expr>` and returns
// the expression text by matching [], {}, () and respecting string literals.
// Used as a fallback when the whole script has syntax errors in DOM code.
function extractDecl(src: string, name: string): string | null {
  const re = new RegExp(`(?:const|let|var)\\s+${name}\\s*=`, 'g')
  const m = re.exec(src)
  if (!m) return null
  let i = m.index + m[0].length
  // skip whitespace
  while (i < src.length && /\s/.test(src[i])) i++
  const start = i
  const stack: string[] = []
  let inStr: string | null = null
  let esc = false
  while (i < src.length) {
    const ch = src[i]
    if (inStr) {
      if (esc) { esc = false }
      else if (ch === '\\') { esc = true }
      else if (ch === inStr) { inStr = null }
      i++
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue }
    if (ch === '/' && src[i + 1] === '/') { // line comment
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (ch === '/' && src[i + 1] === '*') { // block comment
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (ch === '[' || ch === '{' || ch === '(') { stack.push(ch); i++; continue }
    if (ch === ']' || ch === '}' || ch === ')') {
      const open = stack.pop()
      const expected = ch === ']' ? '[' : ch === '}' ? '{' : '('
      if (open !== expected) return null
      i++
      if (stack.length === 0) return src.slice(start, i)
      continue
    }
    i++
  }
  return null
}

function tryExtract(html: string, vars: string[]): Record<string, any> {
  const scripts = extractScripts(html).map((s) => toVar(s))
  const sandbox = makeSandbox()
  vm.createContext(sandbox)
  // Wrap each block in try/catch (var escapes the block to global scope),
  // so one failing DOM-dependent block doesn't stop later data blocks.
  const wrapped = scripts.map((s) => `try{\n${s}\n}catch(__e){}\n`).join('\n;\n')
  const exportSnippet =
    ';\ntry{\n' +
    vars.map((v) => `globalThis.__X_${v} = typeof ${v}!=='undefined' ? ${v} : undefined;`).join('\n') +
    '\n}catch(e){globalThis.__X_ERR = String(e);}\n'
  const combined = wrapped + '\n;\n' + exportSnippet
  try {
    vm.runInContext(combined, sandbox, { timeout: 8000 })
  } catch (_e) {
    // ignore
  }
  const out: Record<string, any> = {}
  for (const v of vars) {
    const key = `__X_${v}`
    if (sandbox[key] !== undefined) {
      try {
        out[v] = JSON.parse(JSON.stringify(sandbox[key]))
      } catch {
        out[v] = String(sandbox[key])
      }
    }
  }
  if (sandbox.__X_ERR) out.__extractError = String(sandbox.__X_ERR)

  // Fallback: for any var still missing, use bracket-matching to extract just
  // that declaration from the raw HTML and eval it independently. This handles
  // files where DOM code has syntax errors that break the whole script.
  const rawScripts = extractScripts(html).join('\n;\n')
  for (const v of vars) {
    if (out[v] !== undefined) continue
    const decl = extractDecl(rawScripts, v)
    if (!decl) continue
    const sb2 = makeSandbox()
    vm.createContext(sb2)
    try {
      vm.runInContext(`var __R = ${decl};`, sb2, { timeout: 4000 })
      out[v] = JSON.parse(JSON.stringify(sb2.__R))
    } catch (e) {
      out[v + '__extractError'] = String(e)
    }
  }
  return out
}

let totalQuestions = 0
const summary: any[] = []

for (const t of TARGETS) {
  const html = readFileSync(join(UPLOAD_DIR, t.file), 'utf8')
  const data = tryExtract(html, t.vars)
  const outFile = join(OUT_DIR, `${t.slug}.json`)
  writeFileSync(outFile, JSON.stringify({ slug: t.slug, sourceFile: t.file, ...data }, null, 2))
  let nq = 0
  if (data.QUESTIONS) nq = data.QUESTIONS.length
  else if (data.TEST_SECTIONS) nq = data.TEST_SECTIONS.reduce((a: number, s: any) => a + (s.questions?.length || 0), 0)
  else if (data.questionBank) {
    const cls = Object.keys(data.questionBank)
    // sum across all sections/classes
    nq = cls.reduce((a: number, k: string) => {
      const v = data.questionBank[k]
      return a + (Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).reduce((b, kk) => b + (Array.isArray(v[kk]) ? v[kk].length : 0), 0) : 0))
    }, 0)
  }
  totalQuestions += nq
  summary.push({ slug: t.slug, file: t.file, questions: nq, varsFound: Object.keys(data) })
  console.log(`[OK] ${t.file} -> ${t.slug}.json (${nq} questions, vars: ${Object.keys(data).join(', ') || 'NONE'})`)
}

writeFileSync(join(OUT_DIR, '_summary.json'), JSON.stringify({ totalQuestions, assessments: summary }, null, 2))
console.log(`\nDone. ${summary.length} assessments, ${totalQuestions} total questions. Output in ${OUT_DIR}`)
