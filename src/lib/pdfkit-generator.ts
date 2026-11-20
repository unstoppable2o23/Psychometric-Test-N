// Pure JavaScript PDF generator using pdf-lib — zero native dependencies,
// runs safely in the Next.js/Turbopack runtime. No Python, no zlib crashes.
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import { getPersonalityTypeData, getDichotomies, getIntelData, getAllIntel, getStreamData, getLearningStyleDescs } from '@/lib/assessments/report-content'
import { parseInterpretation } from '@/lib/smart-interpreter'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 51

// Sanitize text for WinAnsi-encoded standard fonts (replace Unicode chars
// that Helvetica/Helvetica-Bold cannot encode with ASCII equivalents).
function sanitize(text: string): string {
  return text
    .replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/→/g, '->').replace(/←/g, '<-')
    .replace(/—/g, '-').replace(/–/g, '-').replace(/'/g, "'").replace(/'/g, "'")
    .replace(/"/g, '"').replace(/"/g, '"').replace(/•/g, '*').replace(/·/g, '-')
    .replace(/&bull;/g, '*').replace(/&middot;/g, '-').replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-').replace(/&rarr;/g, '->').replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"').replace(/&lsquo;/g, "'").replace(/&rsquo;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\u00A0/g, ' ').replace(/\u2026/g, '...')
}

function hex(h: string): ReturnType<typeof rgb> {
  const r = parseInt(h.slice(1, 3), 16) / 255
  const g = parseInt(h.slice(3, 5), 16) / 255
  const b = parseInt(h.slice(5, 7), 16) / 255
  return rgb(r, g, b)
}

const C = {
  NAVY: hex('#0F2A43'), TEAL: hex('#0E7C66'), AMBER: hex('#B45309'),
  SLATE: hex('#334155'), MUTED: hex('#64748B'), LIGHT: hex('#F1F5F9'),
  BORDER: hex('#CBD5E1'), GREEN: hex('#15803D'), WHITE: rgb(1, 1, 1),
  BG_LIGHT: hex('#FAFAFA'), EMERALD_BG: hex('#ECFDF5'),
}

function lvlColor(level: string) {
  if (['High', 'Dominant'].includes(level)) return C.GREEN
  if (['Moderate'].includes(level)) return C.TEAL
  return C.AMBER
}

// Wrap text to fit a max width given a font + size. Returns array of lines.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  text = sanitize(text)
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test
    } else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

export interface ReportPdfData {
  platform: string
  reportId: string
  student: { name: string; email: string; phone?: string | null }
  assessment: { title: string; slug?: string; purpose?: string; category?: string; description?: string }
  attempt: { startedAt?: string; completedAt?: string }
  score: {
    dimensions: any[]
    totalScore?: number | null
    recommendation?: string | null
    topDimensions?: string[]
    domainBreakdown?: any[]
  }
  interpretation?: string
  // Raw answers (question orderIndex -> selected option label) for assessments
  // whose bespoke PDF renderer recomputes from source (e.g. commerce-branch).
  answers?: Record<number, string>
}

export async function generateReportPdf(data: ReportPdfData, id: string): Promise<Buffer> {
  // Commerce Career Selector: delegate to the bespoke 10-page pdf-lib renderer.
  // It recomputes the full CommerceReportResult (clusters, domain split, tiers)
  // from the raw answers + student info, which the generic renderer cannot
  // express. Auth/payment gating stays in the download route that calls this.
  const slug = data.assessment.slug || ''
  if (slug === 'commerce-branch' && data.answers) {
    const { calculateCommerceResults, answersMapToLikertArray } = await import('@/lib/tests/commerce/scoring')
    const { generateCommercePdf } = await import('@/lib/tests/commerce/pdfGenerator')
    const arr = answersMapToLikertArray(data.answers)
    const result = calculateCommerceResults(
      { name: data.student.name || 'Candidate', email: data.student.email || '', phone: data.student.phone || '' },
      arr,
    )
    const bytes = await generateCommercePdf(result, { clientName: data.platform || 'Commerce Career Selector' })
    return Buffer.from(bytes)
  }

  // Unified colourful report for the assessments that previously fell through
  // to the generic table renderer. The unified pipeline (configs + centralized
  // scoring engine + pdf-lib generator) produces bespoke multi-page reports
  // while auth/payment gating remains in the download route.
  const UNIFIED_SLUGS: Record<string, 'humanities' | 'engineering' | 'ideal-career' | 'multi-dimensional'> = {
    'humanities-branch': 'humanities',
    'engineering-branch': 'engineering',
    'ideal-career': 'ideal-career',
    'multi-dimensional': 'multi-dimensional',
  }
  const unifiedTestId = UNIFIED_SLUGS[slug]
  if (unifiedTestId && data.answers) {
    const { getPlatformTestConfig } = await import('@/tests')
    const { getReportConfig } = await import('@/reports/reportConfigs')
    const { evaluateTest, toUnifiedAnswerMap } = await import('@/scoring/scoringEngine')
    const { generateUnifiedReportPdf } = await import('@/pdf-generator/generateReportPdf')
    const cfg = getPlatformTestConfig(unifiedTestId)
    const tpl = getReportConfig(unifiedTestId)
    if (cfg && tpl) {
      const student = {
        name: data.student.name || 'Candidate',
        email: data.student.email || '',
        phone: data.student.phone || '',
      }
      const answers = toUnifiedAnswerMap(cfg, student, data.answers)
      const result = evaluateTest(cfg, student, answers)
      const bytes = await generateUnifiedReportPdf(result, tpl, { clientName: data.platform || 'Psychometric Testing Platform' })
      return Buffer.from(bytes)
    }
  }

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page = doc.addPage([PAGE_W, PAGE_H])
  const contentW = PAGE_W - 2 * MARGIN
  let pages = [page]

  function drawHF(p: PDFPage, pn: number) {
    p.drawRectangle({ x: 0, y: PAGE_H - 40, width: PAGE_W, height: 40, color: C.NAVY })
    p.drawText('Psychometric Testing Platform', { x: MARGIN, y: PAGE_H - 20, size: 10, font: fontBold, color: C.WHITE })
    p.drawText('Confidential Assessment Report', { x: PAGE_W - MARGIN - 150, y: PAGE_H - 20, size: 8, font, color: C.WHITE })
    p.drawLine({ start: { x: MARGIN, y: PAGE_H - 35 }, end: { x: PAGE_W - MARGIN, y: PAGE_H - 35 }, thickness: 0.5, color: C.BORDER })
    p.drawText(`Page ${pn}`, { x: PAGE_W - MARGIN - 40, y: 18, size: 7.5, font, color: C.MUTED })
  }

  let y = PAGE_H - 55
  let pn = 1
  drawHF(page, pn)

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H])
    pages.push(page)
    pn++
    drawHF(page, pn)
    y = PAGE_H - 55
  }

  function ensureSpace(needed: number) {
    if (y - needed < 45) newPage()
  }

  function drawText(text: string, opts: { x?: number; size?: number; font?: PDFFont; color?: any; maxW?: number; lineHeight?: number } = {}) {
    const sz = opts.size ?? 10
    const f = opts.font ?? font
    const col = opts.color ?? C.SLATE
    const maxW = opts.maxW ?? contentW
    const lh = opts.lineHeight ?? sz + 2
    const x = opts.x ?? MARGIN
    const lines = wrapText(text, f, sz, maxW)
    for (const line of lines) {
      ensureSpace(lh)
      page.drawText(line, { x, y: y - sz, size: sz, font: f, color: col })
      y -= lh
    }
  }

  function heading(text: string, size = 14, color = C.TEAL) {
    ensureSpace(size + 8)
    page.drawText(text, { x: MARGIN, y: y - size, size, font: fontBold, color })
    y -= size + 6
  }

  function spacer(h = 8) { y -= h }

  // --- Title ---
  page.drawText('Psychometric Assessment Report', { x: MARGIN, y: y - 18, size: 18, font: fontBold, color: C.NAVY })
  y -= 24
  page.drawText(data.assessment.title, { x: MARGIN, y: y - 12, size: 12, font: fontBold, color: C.TEAL })
  y -= 18

  // --- Student info table ---
  const infoRows = [
    ['Student Name', data.student.name, 'Email', data.student.email],
    ['Mobile', data.student.phone || '—', 'Category', data.assessment.category || '—'],
    ['Assessment Date', fmtDate(data.attempt.completedAt || data.attempt.startedAt), 'Report ID', (data.reportId || '').slice(0, 12)],
  ]
  const colW = [70, 160, 70, contentW - 300]
  infoRows.forEach((row, i) => {
    ensureSpace(26)
    page.drawRectangle({ x: MARGIN, y: y - 22, width: contentW, height: 24, color: i % 2 === 0 ? C.LIGHT : C.WHITE })
    page.drawRectangle({ x: MARGIN, y: y - 22, width: contentW, height: 24, borderColor: C.BORDER, borderWidth: 0.25 })
    let x = MARGIN
    row.forEach((cell, j) => {
      page.drawText(String(cell), { x: x + 5, y: y - 14, size: 9, font: j % 2 === 1 ? fontBold : font, color: j % 2 === 0 ? C.MUTED : C.SLATE })
      x += colW[j]
    })
    y -= 24
  })
  spacer(10)

  // --- Purpose ---
  if (data.assessment.purpose) {
    heading('About This Assessment')
    drawText(data.assessment.purpose, { size: 10 })
    spacer(6)
  }

  // --- Recommendation ---
  if (data.score.recommendation) {
    heading('Key Recommendation')
    drawInfoBox('', data.score.recommendation, C.GREEN, C.EMERALD_BG)
    spacer(8)
  }

  // --- Chart ---
  const dims = data.score.dimensions || []
  if (dims.length > 0) {
    heading('Dimension Profile')
    // Use radar chart for 3-12 dimensions, progress bars otherwise
    if (dims.length >= 3 && dims.length <= 12) {
      const radarR = 90
      ensureSpace(radarR * 2 + 60)
      const cx = MARGIN + contentW / 2
      const cy = y - radarR - 20
      drawRadarChart(dims.slice(0, 12), cx, cy, radarR)
      y = cy - radarR - 30
    } else {
      // Progress bars for >12 dimensions
      const chartDims = dims.slice(0, 16)
      ensureSpace(chartDims.length * 14 + 10)
      chartDims.forEach((d) => { drawProgressBar(d.name || d.code || '', d.pct || 0, d.level || '') })
      spacer(8)
    }
    spacer(6)
  }

  // --- Domain breakdown ---
  if (data.score.domainBreakdown?.length) {
    heading('Stream Comparison')
    const br = data.score.domainBreakdown
    const bcolW = [30, contentW - 30 - 45 - 45 - 50, 45, 45, 50]
    const headers = ['Rank', 'Stream', 'Apt', 'Int', 'Comp']
    ensureSpace(22)
    page.drawRectangle({ x: MARGIN, y: y - 18, width: contentW, height: 20, color: C.NAVY })
    let bx = MARGIN
    headers.forEach((h, i) => {
      page.drawText(h, { x: bx + 4, y: y - 13, size: 9, font: fontBold, color: C.WHITE })
      bx += bcolW[i]
    })
    y -= 20
    br.forEach((b, i) => {
      ensureSpace(22)
      if (i % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - 18, width: contentW, height: 20, color: C.LIGHT })
      bx = MARGIN
      const cells = [String(i + 1), (b.title || b.code || '').slice(0, 25), String(b.aptitude), String(b.interest), String(b.composite)]
      cells.forEach((c, j) => {
        page.drawText(c, { x: bx + 4, y: y - 13, size: 9, font: j === 4 ? fontBold : font, color: C.SLATE })
        bx += bcolW[j]
      })
      y -= 20
    })
    spacer(10)
  }

  // --- Dimension table ---
  if (dims.length > 0) {
    heading('Detailed Dimension Breakdown')
    const tcolW = [contentW - 22 - 22 - 22 - 40, 22, 22, 22, 40]
    const headers = ['Dimension', 'Score', 'Max', '%', 'Level']
    ensureSpace(22)
    page.drawRectangle({ x: MARGIN, y: y - 18, width: contentW, height: 20, color: C.NAVY })
    let bx = MARGIN
    headers.forEach((h, i) => {
      page.drawText(h, { x: bx + 4, y: y - 13, size: 9, font: fontBold, color: C.WHITE })
      bx += tcolW[i]
    })
    y -= 20
    dims.forEach((d, i) => {
      ensureSpace(20)
      if (i % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - 16, width: contentW, height: 18, color: C.LIGHT })
      bx = MARGIN
      const cells = [(d.name || d.code || '').slice(0, 28), String(d.score || 0), String(d.maxScore || 0), `${d.pct || 0}%`, d.level || '—']
      cells.forEach((c, j) => {
        page.drawText(c, { x: bx + 4, y: y - 12, size: 9, font: j === 4 ? fontBold : font, color: C.SLATE })
        bx += tcolW[j]
      })
      y -= 18
    })
    spacer(8)
  }

  // --- Assessment-specific rich content (matches original reference reports) ---
  // `slug` is resolved at the top of this function (used for the commerce-branch
  // short-circuit). Reuse it here for the per-assessment rich-content dispatch.
  const hasSpecificContent = ['personality', 'multiple-intelligence', 'stream-selector', 'learning-style'].includes(slug)

  // Inner helpers for assessment-specific sections
  function drawBullet(text: string, indent = 10) {
    drawText(`* ${text}`, { size: 9.5, maxW: contentW - indent, lineHeight: 12 })
  }
  function drawSectionTitle(text: string) {
    spacer(6); ensureSpace(20)
    page.drawRectangle({ x: MARGIN, y: y - 16, width: contentW, height: 18, color: C.NAVY })
    page.drawText(sanitize(text), { x: MARGIN + 6, y: y - 12, size: 10, font: fontBold, color: C.WHITE })
    y -= 22
  }
  function drawTwoColBox(leftTitle: string, leftPts: string[], rightTitle: string, rightPts: string[]) {
    const colW2 = (contentW - 8) / 2
    const maxPts = Math.max(leftPts.length, rightPts.length)
    const boxH = 20 + maxPts * 14 + 8
    ensureSpace(boxH + 4)
    // Left box
    page.drawRectangle({ x: MARGIN, y: y - boxH, width: colW2, height: boxH, color: C.LIGHT })
    page.drawRectangle({ x: MARGIN, y: y - boxH, width: colW2, height: boxH, borderColor: C.BORDER, borderWidth: 0.5 })
    page.drawText(sanitize(leftTitle), { x: MARGIN + 6, y: y - 14, size: 9, font: fontBold, color: C.SLATE })
    leftPts.forEach((pt, i) => {
      const lines = wrapText(pt, font, 8.5, colW2 - 12)
      lines.forEach((l, j) => { page.drawText(l, { x: MARGIN + 6, y: y - 28 - i * 14 - j * 10, size: 8.5, font, color: C.SLATE }) })
    })
    // Right box
    const rx = MARGIN + colW2 + 8
    page.drawRectangle({ x: rx, y: y - boxH, width: colW2, height: boxH, color: C.LIGHT })
    page.drawRectangle({ x: rx, y: y - boxH, width: colW2, height: boxH, borderColor: C.BORDER, borderWidth: 0.5 })
    page.drawText(sanitize(rightTitle), { x: rx + 6, y: y - 14, size: 9, font: fontBold, color: C.SLATE })
    rightPts.forEach((pt, i) => {
      const lines = wrapText(pt, font, 8.5, colW2 - 12)
      lines.forEach((l, j) => { page.drawText(l, { x: rx + 6, y: y - 28 - i * 14 - j * 10, size: 8.5, font, color: C.SLATE }) })
    })
    y -= boxH + 6
  }

  // Radar/spider chart — visual element for dimension profiles
  function drawRadarChart(chartDims: any[], cx: number, cy: number, radius: number) {
    const n = chartDims.length
    if (n < 3) return
    // Grid: concentric polygons at 25%, 50%, 75%, 100%
    for (const pct of [0.25, 0.5, 0.75, 1.0]) {
      const gridColor = pct === 1.0 ? C.BORDER : hex('#E2E8F0')
      for (let i = 0; i < n; i++) {
        const a1 = (2 * Math.PI * i / n) - Math.PI / 2
        const a2 = (2 * Math.PI * (i + 1) / n) - Math.PI / 2
        const r = radius * pct
        page.drawLine({
          start: { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) },
          end: { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) },
          thickness: 0.5, color: gridColor,
        })
      }
    }
    // Spokes
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i / n) - Math.PI / 2
      page.drawLine({
        start: { x: cx, y: cy },
        end: { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) },
        thickness: 0.4, color: hex('#E2E8F0'),
      })
    }
    // Data polygon points
    const pts = chartDims.map((d, i) => {
      const a = (2 * Math.PI * i / n) - Math.PI / 2
      const r = radius * Math.min(1, (d.pct || 0) / 100)
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
    })
    // Filled polygon — draw lines from center to each vertex to create a "filled" look
    for (let i = 0; i < n; i++) {
      page.drawLine({ start: { x: cx, y: cy }, end: pts[i], thickness: 1, color: hex('#0E7C66'), opacity: 0.2 })
    }
    // Outline (thicker)
    for (let i = 0; i < n; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % n]
      page.drawLine({ start: p1, end: p2, thickness: 2, color: C.TEAL })
    }
    // Data points
    pts.forEach((p) => { page.drawCircle({ x: p.x, y: p.y, size: 3, color: C.TEAL }) })
    // Labels
    chartDims.forEach((d, i) => {
      const a = (2 * Math.PI * i / n) - Math.PI / 2
      const lr = radius + 16
      const lx = cx + lr * Math.cos(a), ly = cy + lr * Math.sin(a)
      const name = sanitize((d.name || d.code || '').slice(0, 14))
      const tw = font.widthOfTextAtSize(name, 7)
      page.drawText(name, { x: lx - tw / 2, y: ly - 3, size: 7, font, color: C.SLATE })
    })
  }

  // Progress bar — visual element for individual scores
  function drawProgressBar(label: string, pct: number, lvl: string, w?: number) {
    const barW = w || contentW
    const labelW = 120
    const barAreaW = barW - labelW - 40
    ensureSpace(20)
    const lc = lvlColor(lvl)
    // Label
    page.drawText(sanitize(label.slice(0, 18)), { x: MARGIN, y: y - 8, size: 8, font, color: C.SLATE })
    // Background bar
    page.drawRectangle({ x: MARGIN + labelW, y: y - 10, width: barAreaW, height: 8, color: C.LIGHT })
    page.drawRectangle({ x: MARGIN + labelW, y: y - 10, width: barAreaW, height: 8, borderColor: C.BORDER, borderWidth: 0.25 })
    // Filled bar
    page.drawRectangle({ x: MARGIN + labelW, y: y - 10, width: Math.max(1, barAreaW * pct / 100), height: 8, color: lc })
    // Percentage
    page.drawText(`${pct}%`, { x: MARGIN + labelW + barAreaW + 5, y: y - 8, size: 8, font: fontBold, color: lc })
    y -= 14
  }

  // Colored info callout box
  function drawInfoBox(title: string, body: string, color = C.TEAL, bgColor = hex('#ECFDF5')) {
    const lines = wrapText(body, font, 10, contentW - 24)
    const boxH = lines.length * 14 + 20
    ensureSpace(boxH + 4)
    page.drawRectangle({ x: MARGIN, y: y - boxH, width: contentW, height: boxH, color: bgColor })
    page.drawRectangle({ x: MARGIN, y: y - boxH, width: 4, height: boxH, color })
    if (title) {
      page.drawText(sanitize(title), { x: MARGIN + 12, y: y - 14, size: 10, font: fontBold, color })
    }
    lines.forEach((l, i) => {
      page.drawText(l, { x: MARGIN + 12, y: y - (title ? 28 : 14) - i * 14, size: 10, font, color: C.SLATE })
    })
    y -= boxH + 6
  }

  if (hasSpecificContent) {
    ensureSpace(40)
    spacer(8)

    // === PERSONALITY ===
    if (slug === 'personality') {
      // Extract 4-letter type from recommendation
      const typeMatch = (data.score.recommendation || '').match(/\b([EI][NS][TF][JP])\b/)
      const typeCode = typeMatch ? typeMatch[1] : ''
      const td = getPersonalityTypeData(typeCode)

      heading('Your Personality', 16, C.NAVY)
      if (td) {
        page.drawText(`Your personality type is ${typeCode}: ${sanitize(td.nick)}`, { x: MARGIN, y: y - 12, size: 13, font: fontBold, color: C.TEAL })
        y -= 20
      }

      // Score breakdown with progress bars
      drawSectionTitle('Your Preference Scores')
      for (const d of dims.slice(0, 8)) {
        drawProgressBar(d.name || d.code || '', d.pct || 0, d.level || '')
      }
      spacer(6)

      // Dichotomy tables — each on its own page for professional layout
      for (const dich of getDichotomies()) {
        newPage()
        heading(dich.name, 13, C.NAVY)
        drawText(dich.desc, { size: 10, color: C.MUTED })
        spacer(10)
        drawTwoColBox(dich.left, dich.leftPts, dich.right, dich.rightPts)
        // Visual comparison bar
        spacer(8)
        const pairDim = dims.find((d: any) => d.code === dich.pair)
        const vsDim = dims.find((d: any) => d.code === dich.vs)
        if (pairDim && vsDim) {
          ensureSpace(30)
          page.drawText(sanitize(`${dich.left}: ${pairDim.pct}%  |  ${dich.right}: ${vsDim.pct}%`), { x: MARGIN, y: y - 10, size: 10, font: fontBold, color: C.SLATE })
          y -= 16
          // Visual bar showing the split
          const barW = contentW
          const leftPct = pairDim.pct || 50
          page.drawRectangle({ x: MARGIN, y: y - 8, width: barW * leftPct / 100, height: 8, color: C.TEAL })
          page.drawRectangle({ x: MARGIN + barW * leftPct / 100, y: y - 8, width: barW * (100 - leftPct) / 100, height: 8, color: C.AMBER })
          y -= 14
        }
      }

      // Personality profile — new page
      if (td) {
        newPage()
        drawSectionTitle('Your Personality Profile')
        drawText(td.profile, { size: 11, lineHeight: 16 })
        spacer(10)
        drawInfoBox('About Your Type', `Your four-letter type code ${typeCode} (${sanitize(td.nick)}) reflects your natural preferences across four key dimensions of personality. This profile is based on your responses and represents your inherent tendencies.`, C.TEAL, hex('#ECFDF5'))
      }

      // Strengths & Challenges — new page
      if (td) {
        newPage()
        drawSectionTitle('Strengths & Challenges')
        drawText('Every personality type comes with inherent strengths and potential challenges. Understanding both helps you leverage your natural abilities while being mindful of areas for growth.', { size: 10, color: C.MUTED })
        spacer(8)
        drawTwoColBox('Strengths', td.strengths || [], 'Challenges', td.challenges || [])
      }

      // Recommendations — new page
      if (td) {
        newPage()
        drawSectionTitle('Recommendations for Growth')
        drawText('The following recommendations are tailored to your personality type. Consider each carefully and implement the ones that resonate most with your personal and academic goals.', { size: 10, color: C.MUTED })
        spacer(8)
        for (const rec of (td.recs || [])) {
          ensureSpace(40)
          drawInfoBox('', rec, C.TEAL, hex('#F0FDFA'))
          spacer(4)
        }
      }

      // Careers — new page
      if (td) {
        newPage()
        drawSectionTitle('Recommended Careers')
        drawText('Based on your personality type, these career paths align well with your natural preferences and strengths.', { size: 10, color: C.MUTED })
        spacer(10)
        // Career table
        const cColW = [contentW * 0.35, contentW * 0.25, contentW * 0.2, contentW * 0.2]
        const cHeaders = ['Career Title', 'Cluster', 'Salary', 'Rating']
        ensureSpace(24)
        page.drawRectangle({ x: MARGIN, y: y - 18, width: contentW, height: 20, color: C.NAVY })
        let cx2 = MARGIN
        cHeaders.forEach((h, i) => {
          page.drawText(h, { x: cx2 + 5, y: y - 13, size: 9, font: fontBold, color: C.WHITE })
          cx2 += cColW[i]
        })
        y -= 20
        for (const career of (td.careers || [])) {
          const arr = Array.isArray(career) ? career : [career]
          ensureSpace(22)
          page.drawRectangle({ x: MARGIN, y: y - 18, width: contentW, height: 20, color: C.LIGHT })
          cx2 = MARGIN
          const cells = [sanitize(arr[0] || ''), sanitize(arr[1] || ''), sanitize(arr[2] || ''), '*****']
          cells.forEach((c, i) => {
            page.drawText(c, { x: cx2 + 5, y: y - 13, size: 9, font: i === 0 ? fontBold : font, color: C.SLATE })
            cx2 += cColW[i]
          })
          y -= 20
        }
      }
    }

    // === MULTIPLE INTELLIGENCE ===
    else if (slug === 'multiple-intelligence') {
      const intel = getAllIntel()
      // Sort dimensions by score descending
      const sortedDims = [...dims].sort((a, b) => (b.pct || 0) - (a.pct || 0))

      for (const d of sortedDims) {
        const code = d.code
        const info = intel[code]
        if (!info) continue

        ensureSpace(120)
        spacer(6)
        // Title bar
        page.drawRectangle({ x: MARGIN, y: y - 24, width: contentW, height: 26, color: lvlColor(d.level || '') })
        page.drawText(sanitize(info.name || d.name), { x: MARGIN + 8, y: y - 18, size: 12, font: fontBold, color: C.WHITE })
        page.drawText(`${d.pct || 0}% - ${d.level || ''}`, { x: MARGIN + contentW - 100, y: y - 18, size: 10, font: fontBold, color: C.WHITE })
        y -= 32

        // Description
        drawText(info.desc || d.dimensionDescription || '', { size: 9.5, lineHeight: 13 })
        spacer(6)

        // Strengths
        if (info.strengths?.length) {
          drawSectionTitle('Strengths')
          for (const s of info.strengths) { drawBullet(s) }
        }
        // Challenges
        if (info.challenges?.length) {
          spacer(6)
          drawSectionTitle('Challenges')
          for (const s of info.challenges) { drawBullet(s) }
        }
        // Famous people
        if (info.famous?.length) {
          spacer(6)
          drawSectionTitle('Famous People with This Intelligence')
          for (const f of info.famous) { drawBullet(f) }
        }
        // Careers
        if (info.careers?.length) {
          spacer(6)
          drawSectionTitle('Top Careers')
          for (const c of info.careers) { drawBullet(c) }
        }
        // Advice
        if (info.advice) {
          spacer(6)
          drawSectionTitle('Development Advice')
          drawText(info.advice, { size: 9.5, lineHeight: 13 })
        }
      }
    }

    // === STREAM SELECTOR ===
    else if (slug === 'stream-selector') {
      const br = data.score.domainBreakdown || []
      heading('Stream Preference Analysis', 16, C.NAVY)
      drawText('The most critical decision you will make early in your career is selecting the field of study you want to pursue. Your preferred streams are ranked below.', { size: 10 })
      spacer(8)

      for (let i = 0; i < br.length; i++) {
        const b = br[i]
        const sd = getStreamData(b.code)
        ensureSpace(100)
        spacer(6)
        // Rank header
        const rankColor = i === 0 ? C.GREEN : C.MUTED
        page.drawRectangle({ x: MARGIN, y: y - 24, width: contentW, height: 26, color: rankColor })
        page.drawText(`Rank ${i + 1}: ${sanitize(b.title)}`, { x: MARGIN + 8, y: y - 18, size: 12, font: fontBold, color: C.WHITE })
        page.drawText(`Composite: ${b.composite}/100`, { x: MARGIN + contentW - 120, y: y - 18, size: 10, font: fontBold, color: C.WHITE })
        y -= 32

        if (i === 0) {
          page.drawText('Recommended Choice', { x: MARGIN, y: y - 10, size: 10, font: fontBold, color: C.GREEN })
          y -= 14
        }

        // Scores
        drawText(`Aptitude: ${b.aptitude}/100  |  Interest: ${b.interest}/100  |  Composite: ${b.composite}/100`, { size: 10, color: C.MUTED })
        spacer(6)

        if (sd) {
          drawText(sd.description || '', { size: 9.5, lineHeight: 13 })
          if (sd.advantages?.length) {
            spacer(6)
            drawSectionTitle('Advantages')
            for (const a of sd.advantages) { drawBullet(a) }
          }
          if (sd.courses?.length) {
            spacer(6)
            drawSectionTitle('Key Courses / Subjects')
            for (const c of sd.courses) { drawBullet(c) }
          }
        }
      }
    }

    // === LEARNING STYLE ===
    else if (slug === 'learning-style') {
      const descs = getLearningStyleDescs()
      const sortedDims = [...dims].sort((a, b) => (b.pct || 0) - (a.pct || 0))

      heading('Your Learning Style Profile', 16, C.NAVY)
      drawText('Everyone has a unique learning style. Understanding your preferences can help you study more effectively and choose complementary learning strategies.', { size: 10 })
      spacer(8)

      for (const d of sortedDims) {
        const desc = descs[d.name || d.code]
        const lc = lvlColor(d.level || '')
        ensureSpace(40)
        // Header bar
        page.drawRectangle({ x: MARGIN, y: y - 20, width: contentW, height: 22, color: lc })
        page.drawText(sanitize(d.name || d.code), { x: MARGIN + 8, y: y - 14, size: 10, font: fontBold, color: C.WHITE })
        page.drawText(`${d.pct || 0}% - ${d.level || ''}`, { x: MARGIN + contentW - 80, y: y - 14, size: 9, font: fontBold, color: C.WHITE })
        y -= 26

        if (desc) {
          drawText(desc, { size: 9.5, lineHeight: 13 })
        }
        if (d.strengths?.length) {
          for (const s of d.strengths.slice(0, 3)) { drawBullet(s) }
        }
        spacer(4)
      }
    }
  }

  // --- Generic detailed dimension analysis (only if no specific content) ---
  if (dims.length > 0 && !hasSpecificContent) {
    newPage()
    heading('Detailed Dimension Analysis', 14, C.TEAL)
    drawText('This section provides an in-depth analysis of each measured dimension, including the score, interpretation level, key strengths and recommended development areas.')
    spacer(8)

    for (const d of dims) {
      const lvl = d.level || ''
      const lc = lvlColor(lvl)
      const dimName = d.name || d.code || ''
      const dimDesc = d.dimensionDescription || d.description || ''

      // Calculate body height
      const bodyTexts: string[] = []
      if (dimDesc) bodyTexts.push(`What this measures: ${dimDesc}`)
      bodyTexts.push(`Score: ${d.score || 0} / ${d.maxScore || 0} (${d.pct || 0}%) — ${lvl} level. ${d.description || ''}`)
      const strengths = d.strengths || []
      const devAreas = d.developmentAreas || []

      const bodyLines: { text: string; indent: number; color: any; bold: boolean; size: number }[] = []
      bodyTexts.forEach((t) => {
        wrapText(t, font, 8.5, contentW - 20).forEach((l) => bodyLines.push({ text: l, indent: 0, color: C.SLATE, bold: false, size: 8.5 }))
      })
      if (strengths.length) {
        bodyLines.push({ text: `Key strengths (${lvl.toLowerCase()} score):`, indent: 0, color: C.GREEN, bold: true, size: 8.5 })
        strengths.slice(0, 5).forEach((s) => wrapText(`• ${s}`, font, 8.5, contentW - 30).forEach((l) => bodyLines.push({ text: l, indent: 12, color: C.SLATE, bold: false, size: 8.5 })))
      }
      if (devAreas.length) {
        bodyLines.push({ text: 'Development areas to focus on:', indent: 0, color: C.AMBER, bold: true, size: 8.5 })
        devAreas.slice(0, 5).forEach((s) => wrapText(`• ${s}`, font, 8.5, contentW - 30).forEach((l) => bodyLines.push({ text: l, indent: 12, color: C.SLATE, bold: false, size: 8.5 })))
      }

      const bodyH = bodyLines.length * 11 + 12
      ensureSpace(24 + bodyH)

      // Header bar
      page.drawRectangle({ x: MARGIN, y: y - 22, width: contentW, height: 24, color: lc })
      page.drawText(dimName, { x: MARGIN + 8, y: y - 16, size: 10, font: fontBold, color: C.WHITE })
      page.drawText(`${d.pct || 0}% · ${lvl}`, { x: MARGIN + contentW * 0.7, y: y - 16, size: 10, font: fontBold, color: C.WHITE })
      y -= 24

      // Body background + border
      page.drawRectangle({ x: MARGIN, y: y - bodyH, width: contentW, height: bodyH, color: C.BG_LIGHT })
      page.drawRectangle({ x: MARGIN, y: y - bodyH, width: 3, height: bodyH, color: lc })
      page.drawRectangle({ x: MARGIN, y: y - bodyH, width: contentW, height: bodyH, borderColor: C.BORDER, borderWidth: 0.25 })

      let by = y - 4
      for (const bl of bodyLines) {
        page.drawText(bl.text, { x: MARGIN + 8 + bl.indent, y: by - 8, size: bl.size, font: bl.bold ? fontBold : font, color: bl.color })
        by -= 11
      }
      y -= bodyH + 8
      spacer(6)
    }
  }

  // --- Smart Interpreter: Counsellor's Deep-Dive Interpretation (page 10) ---
  if (data.interpretation) {
    const parsed = parseInterpretation(data.interpretation)
    newPage()
    // Section header
    page.drawRectangle({ x: MARGIN, y: y - 20, width: contentW, height: 24, color: C.NAVY })
    page.drawText("Counselor's Deep-Dive Interpretation", { x: MARGIN + 8, y: y - 15, size: 11, font: fontBold, color: C.WHITE })
    y -= 30
    spacer(6)
    // Executive Synthesis
    if (parsed.executiveSynthesis) {
      heading('Executive Synthesis', 11, C.TEAL)
      drawText(parsed.executiveSynthesis, { size: 10, lineHeight: 14 })
      spacer(8)
    }
    // Career Synergies
    if (parsed.careerSynergies) {
      heading('Career Synergies', 11, C.TEAL)
      drawText(parsed.careerSynergies, { size: 10, lineHeight: 14 })
      spacer(8)
    }
    // Action Plan
    if (parsed.actionPlan?.length) {
      heading('Your Customized Execution Plan', 11, C.TEAL)
      drawText('The following action items are tailored to the student assessment results:', { size: 10, color: C.MUTED })
      spacer(4)
      for (const item of parsed.actionPlan) {
        ensureSpace(30)
        drawInfoBox('', item, C.TEAL, hex('#F0FDFA'))
        spacer(4)
      }
    }
  }

  // --- Next Steps ---
  spacer(10)
  heading('Next Steps & Recommendations')
  drawText('Based on the assessment results, the following next steps are recommended:')
  const steps = [
    'Review this report carefully and reflect on how the dimension scores align with your self-perception.',
    'Identify your top 2-3 dimensions as potential areas of natural strength to leverage in academic and career planning.',
    'Select 1-2 development areas and create a concrete action plan with specific, measurable goals.',
    'Discuss this report with a qualified career counsellor or mentor to contextualise the findings.',
    'Re-take the assessment after 6-12 months to track changes in your profile over time.',
  ]
  steps.forEach((s) => {
    drawText(`• ${s}`, { size: 10, maxW: contentW - 10 })
  })

  // --- Disclaimer ---
  spacer(12)
  heading('Important Note')
  drawText('This report is based on a self-report psychometric screening instrument and is intended for guidance purposes only. It is not a clinical diagnosis. Results should be interpreted alongside one-to-one counselling, academic records and other relevant context. For career-critical decisions, please consult a qualified career counsellor.', { size: 8.5, color: C.MUTED })

  doc.setTitle(`${data.assessment.title} Report - ${data.student.name}`)
  doc.setAuthor('Psychometric Testing Platform')
  doc.setCreator('Psychometric Testing Platform')

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}

function fmtDate(s?: string): string {
  if (!s) return '—'
  try { return new Date(s.replace('Z', '')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(s) }
}

// --- Counsellor interpretation manual PDF ---
export interface ManualContent {
  title: string; purpose: string; constructsMeasured: string; targetPopulation: string
  scoringMethodology: string; behaviouralIndicators: string[]; strengthsAndDevelopment: string
  counsellingApproach: string; limitations: string; sampleInterpretation: string
  dimensions: { name: string; description: string; high: string; moderate: string; low: string }[]
}

export async function generateManualPdf(content: ManualContent, id: string): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  let page = doc.addPage([PAGE_W, PAGE_H])
  const PLUM = hex('#5B21B6')
  let pn = 1

  function drawHF(p: PDFPage) {
    p.drawRectangle({ x: 0, y: PAGE_H - 40, width: PAGE_W, height: 40, color: PLUM })
    p.drawText('Counsellor Interpretation Manual', { x: MARGIN, y: PAGE_H - 20, size: 10, font: fontBold, color: C.WHITE })
    p.drawText('CONFIDENTIAL', { x: PAGE_W - MARGIN - 70, y: PAGE_H - 20, size: 8, font, color: C.WHITE })
    p.drawLine({ start: { x: MARGIN, y: 25 }, end: { x: PAGE_W - MARGIN, y: 25 }, thickness: 0.5, color: C.BORDER })
    p.drawText(`Page ${pn}`, { x: PAGE_W - MARGIN - 40, y: 18, size: 7.5, font, color: C.MUTED })
  }
  drawHF(page)

  let y = PAGE_H - 55
  function newPage() { page = doc.addPage([PAGE_W, PAGE_H]); pn++; drawHF(page); y = PAGE_H - 55 }
  function ensureSpace(h: number) { if (y - h < 45) newPage() }
  function heading(text: string, size = 13, color = PLUM) { ensureSpace(size + 8); page.drawText(text, { x: MARGIN, y: y - size, size, font: fontBold, color }); y -= size + 6 }
  function body(text: string, size = 9.5) {
    const lines = wrapText(text, font, size, contentW)
    for (const l of lines) { ensureSpace(size + 2); page.drawText(l, { x: MARGIN, y: y - size, size, font, color: C.SLATE }); y -= size + 2 }
  }
  const contentW = PAGE_W - 2 * MARGIN

  heading(content.title, 17, PLUM); y -= 4
  const sections: [string, string][] = [
    ['Purpose', content.purpose], ['Constructs Measured', content.constructsMeasured],
    ['Target Population', content.targetPopulation], ['Scoring Methodology', content.scoringMethodology],
  ]
  sections.forEach(([h, b]) => { heading(h); body(b) })

  if (content.dimensions?.length) {
    heading('Dimensions & Interpretation Bands')
    content.dimensions.forEach((d) => {
      ensureSpace(60)
      page.drawText(d.name, { x: MARGIN, y: y - 10, size: 9.5, font: fontBold, color: C.SLATE }); y -= 12
      body(d.description.slice(0, 150), 8.5)
      const bands: [string, string, any][] = [['High: ', d.high, C.GREEN], ['Moderate: ', d.moderate, C.TEAL], ['Low: ', d.low, C.AMBER]]
      bands.forEach(([label, val, col]) => {
        const lines = wrapText(`${label}${val.slice(0, 150)}`, font, 8, contentW)
        lines.forEach((l) => { ensureSpace(11); page.drawText(l, { x: MARGIN, y: y - 8, size: 8, font: fontBold, color: col }); y -= 11 })
      })
      y -= 4
    })
  }

  heading('Behavioural Indicators')
  content.behaviouralIndicators?.forEach((b) => {
    const lines = wrapText(`• ${b}`, font, 9.5, contentW - 10)
    lines.forEach((l) => { ensureSpace(12); page.drawText(l, { x: MARGIN + 10, y: y - 10, size: 9.5, font, color: C.SLATE }); y -= 12 })
  })

  const more: [string, string][] = [
    ['Strengths & Development Areas', content.strengthsAndDevelopment],
    ['Counselling Approach', content.counsellingApproach],
    ['Assessment Limitations', content.limitations],
    ['Sample Interpretation', content.sampleInterpretation],
  ]
  more.forEach(([h, b]) => { heading(h); body(b) })

  doc.setTitle(content.title)
  doc.setAuthor('Psychometric Testing Platform')

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}
