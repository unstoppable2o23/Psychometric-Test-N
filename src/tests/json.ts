// Server-side JSON data loader for the unified test configs. Mirrors the
// platform loader's approach (fs + cache) so configs read the canonical
// scripts/out/*.json sources with zero data duplication.
// Server-only — never import from client components.

import fs from 'fs'
import path from 'path'

const OUT = path.join(process.cwd(), 'scripts', 'out')
const cache: Record<string, unknown> = {}

export function loadJson<T = Record<string, unknown>>(name: string): T {
  if (cache[name]) return cache[name] as T
  const p = path.join(OUT, `${name}.json`)
  const data = JSON.parse(fs.readFileSync(p, 'utf8'))
  cache[name] = data
  return data as T
}
