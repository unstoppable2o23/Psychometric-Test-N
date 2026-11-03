import { spawn } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const PDF_SCRIPTS = path.join(process.cwd(), 'scripts', 'pdf')
const REPORT_OUT = path.join(process.cwd(), 'var', 'reports')

async function runPython(script: string, jsonPath: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const py = process.env.PYTHON_BIN || 'python3'
    const p = spawn(py, [script, jsonPath, outPath], { stdio: ['ignore', 'pipe', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err += d.toString() })
    p.on('error', reject)
    p.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`PDF generation failed (code ${code}): ${err.slice(0, 800)}`))
    })
  })
}

async function withTempJson(data: unknown, fn: (jsonPath: string) => Promise<void>) {
  const tmp = path.join(os.tmpdir(), `ppt-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  await fs.writeFile(tmp, JSON.stringify(data))
  try { await fn(tmp) } finally { await fs.unlink(tmp).catch(() => {}) }
}

export async function generateReportPdf(data: unknown, id: string): Promise<string> {
  await fs.mkdir(REPORT_OUT, { recursive: true })
  const out = path.join(REPORT_OUT, `report-${id}.pdf`)
  await withTempJson(data, (jsonPath) => runPython(path.join(PDF_SCRIPTS, 'report.py'), jsonPath, out))
  return out
}

export async function generateManualPdf(data: unknown, id: string): Promise<string> {
  await fs.mkdir(REPORT_OUT, { recursive: true })
  const out = path.join(REPORT_OUT, `manual-${id}.pdf`)
  await withTempJson(data, (jsonPath) => runPython(path.join(PDF_SCRIPTS, 'manual.py'), jsonPath, out))
  return out
}
