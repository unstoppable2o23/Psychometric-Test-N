import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import vm from 'vm'

function extractScripts(html: string): string[] {
  const scripts: string[] = []
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    if (!/src\s*=/.test(m[0].slice(0, m[0].indexOf('>')))) {
      if (m[1].trim()) scripts.push(m[1])
    }
  }
  return scripts
}
const toVar = (s: string) => s.replace(/(^|\n)([ \t]*)(const|let)\s+/g, (_m, p, ind) => `${p}${ind}var `)

function extractDecl(src: string, name: string): string | null {
  const re = new RegExp(`(?:const|let|var)\\s+${name}\\s*=`, 'g')
  const m = re.exec(src)
  if (!m) return null
  let i = m.index + m[0].length
  while (i < src.length && /\s/.test(src[i])) i++
  const start = i
  const stack: string[] = []
  let inStr: string | null = null
  let esc = false
  while (i < src.length) {
    const ch = src[i]
    if (inStr) { if (esc) { esc = false } else if (ch === '\\') { esc = true } else if (ch === inStr) { inStr = null }; i++; continue }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i++; continue }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
    if (ch === '[' || ch === '{' || ch === '(') { stack.push(ch); i++; continue }
    if (ch === ']' || ch === '}' || ch === ')') { stack.pop(); i++; if (!stack.length) return src.slice(start, i + 1); continue }
    i++
  }
  return null
}

const noop = () => {}
const fakeEl: any = new Proxy({}, {
  get(_t, prop) {
    if (prop === 'style') return {}
    if (prop === 'classList') return { add: noop, remove: noop, toggle: noop, contains: () => false }
    return noop
  },
  set() { return true },
})
const fakeDoc: any = new Proxy({}, {
  get(_t, prop) {
    if (prop === 'createElement' || prop === 'getElementById' || prop === 'querySelector') return () => fakeEl
    if (prop === 'querySelectorAll' || prop === 'getElementsByTagName') return () => []
    return noop
  },
})
const sandbox: any = {
  document: fakeDoc, window: {}, console, confetti: noop,
  Chart: function() { return {} }, $: () => fakeEl, tailwind: { config: noop },
  localStorage: { getItem: () => null, setItem: noop }, setTimeout: noop, alert: noop,
  Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Map, Set, Symbol, Promise,
  parseInt, parseFloat, isNaN, undefined, NaN, Infinity,
}
sandbox.window.document = fakeDoc; sandbox.self = sandbox; sandbox.globalThis = sandbox

// Files and their report-content variables
const targets = [
  { file: 'Personality Test.html', slug: 'personality', vars: ['typeData'] },
  { file: 'Learning Styles.html', slug: 'learning-style', vars: ['DESCS', 'RECS'] },
  { file: 'Multiple Intelligence Test.html', slug: 'multiple-intelligence', vars: ['INTEL', 'CLUSTER_MAP', 'SALARY_MAP'] },
  { file: 'stream selector test.html', slug: 'stream-selector', vars: ['STREAM_DATABASE', 'TEST_SECTIONS'] },
]

mkdirSync('scripts/out', { recursive: true })

for (const { file, slug, vars } of targets) {
  const html = readFileSync(`upload/${file}`, 'utf8')
  const scripts = extractScripts(html)
  const combined = scripts.map(toVar).map(s => `try{\n${s}\n}catch(__e){}\n`).join('\n')
  const exportSnippet = ';\ntry{\n' + vars.map(v => `globalThis.__X_${v} = typeof ${v}!=='undefined' ? ${v} : undefined;`).join('\n') + '\n}catch(e){}\n'
  const ctx: any = { ...sandbox }
  vm.createContext(ctx)
  try { vm.runInContext(combined + '\n' + exportSnippet, ctx, { timeout: 5000 }) } catch {}

  const out: any = {}
  for (const v of vars) {
    if (ctx[`__X_${v}`] !== undefined) {
      out[v] = JSON.parse(JSON.stringify(ctx[`__X_${v}`]))
    } else {
      // Fallback: bracket-match
      const decl = extractDecl(scripts.join('\n;\n'), v)
      if (decl) {
        const ctx2: any = { ...sandbox }; vm.createContext(ctx2)
        try { vm.runInContext(`var __R = ${decl};`, ctx2, { timeout: 3000 }); out[v] = JSON.parse(JSON.stringify(ctx2.__R)) } catch {}
      }
    }
  }
  writeFileSync(`scripts/out/${slug}-report.json`, JSON.stringify({ slug, file, ...out }, null, 2))
  console.log(`[OK] ${file} -> ${slug}-report.json | vars: ${Object.keys(out).join(', ') || 'NONE'}`)
}
