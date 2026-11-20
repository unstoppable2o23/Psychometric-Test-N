/**
 * report-formats.ts
 *
 * Five assessment-specific PDF report generators built on pdf-lib.
 * Each generator produces a multi-page PDF that mirrors the layout of
 * the corresponding reference PDF (Stream Selector, Personality Type,
 * Multiple Intelligence, Learning Style, Ideal Career).
 *
 * Design rules:
 *  - pdf-lib standard fonts use WinAnsi encoding, so all text is passed
 *    through `sanitize()` to replace Unicode chars (em-dash, smart quotes,
 *    bullets, arrows) with ASCII equivalents.
 *  - Origin is BOTTOM-LEFT (y increases upward).
 *  - Colors use `rgb(0..1, 0..1, 0..1)` via the `hex()` helper.
 *  - Text is wrapped manually with `wrapText()`.
 *  - Page breaks are handled by tracking `y` and calling `newPage()` when
 *    `y` drops below a safe bottom margin.
 *
 * Every generator takes `(data: any, outPath: string)` and returns the
 * written file path. `data` follows the `ReportData` interface described
 * in the task spec.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Shared helpers — kept local (mirroring pdfkit-generator.ts) so this file
// is fully self-contained and tree-shakeable.
// ---------------------------------------------------------------------------

/** Replace Unicode characters that Helvetica (WinAnsi) cannot encode. */
function sanitize(text: string): string {
  if (text == null) return ''
  return String(text)
    .replace(/≥/g, '>=').replace(/≤/g, '<=')
    .replace(/→/g, '->').replace(/←/g, '<-')
    .replace(/—/g, '-').replace(/–/g, '-')
    .replace(/'/g, "'").replace(/'/g, "'")
    .replace(/"/g, '"').replace(/"/g, '"')
    .replace(/•/g, '*').replace(/·/g, '-')
    .replace(/&bull;/g, '*').replace(/&middot;/g, '-')
    .replace(/&mdash;/g, '-').replace(/&ndash;/g, '-')
    .replace(/&rarr;/g, '->').replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"').replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\u00A0/g, ' ').replace(/\u2026/g, '...')
}

/** Convert #RRGGBB -> pdf-lib rgb color. */
function hex(h: string): ReturnType<typeof rgb> {
  const r = parseInt(h.slice(1, 3), 16) / 255
  const g = parseInt(h.slice(3, 5), 16) / 255
  const b = parseInt(h.slice(5, 7), 16) / 255
  return rgb(r, g, b)
}

/** Shared color palette. */
const C = {
  NAVY: hex('#0F2A43'), TEAL: hex('#0E7C66'), AMBER: hex('#B45309'),
  SLATE: hex('#334155'), MUTED: hex('#64748B'), LIGHT: hex('#F1F5F9'),
  BORDER: hex('#CBD5E1'), GREEN: hex('#15803D'), WHITE: rgb(1, 1, 1),
  BG_LIGHT: hex('#FAFAFA'), EMERALD_BG: hex('#ECFDF5'),
  AMBER_BG: hex('#FEF3C7'), TEAL_BG: hex('#CCFBF1'),
  PLUM: hex('#5B21B6'), ROSE: hex('#BE123C'),
}

/** Map an interpretation level to its color. */
function lvlColor(level: string): ReturnType<typeof rgb> {
  const l = (level || '').toLowerCase()
  if (['high', 'dominant', 'strong'].includes(l)) return C.GREEN
  if (['moderate', 'medium'].includes(l)) return C.TEAL
  return C.AMBER
}

/** Word-wrap text to a max pixel width for a given font / size. */
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

/** Format an ISO date as DD-Mon-YYYY. */
function fmtDate(s?: string | null): string {
  if (!s) return '-'
  try {
    return new Date(String(s).replace('Z', '')).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return String(s)
  }
}

// ---------------------------------------------------------------------------
// Extracted JSON loaders
// ---------------------------------------------------------------------------

const OUT_DIR = path.join(process.cwd(), 'scripts', 'out')

function loadData<T = any>(slug: string): T | null {
  try {
    const p = path.join(OUT_DIR, `${slug}.json`)
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Embedded static content (kept here because the source JSON files do not
// include cluster / type description databases — only question banks).
// ---------------------------------------------------------------------------

/**
 * MBTI-style type profiles keyed by 4-letter code. Used by the Personality
 * report to render the "Your Personality Profile" + strengths / challenges /
 * career recommendations blocks.
 */
const PERSONALITY_PROFILES: Record<string, {
  title: string
  profile: string
  strengths: string[]
  challenges: string[]
  careers: string[]
}> = {
  INTJ: { title: 'The Architect', profile: 'Imaginative and strategic thinkers, with a plan for everything.', strengths: ['Strategic and long-range thinking', 'High intellectual independence', 'Strong willpower and decisive action', 'Naturally sceptical and analytical'], challenges: ['Can be perceived as aloof or arrogant', 'Struggles with emotional nuance', 'Dislikes routine or bureaucratic work', 'May overlook interpersonal sensitivities'], careers: ['Scientist / Researcher', 'Strategic Consultant', 'Architect', 'Software Engineer', 'Investment Strategist'] },
  INTP: { title: 'The Logician', profile: 'Innovative inventors with an unquenchable thirst for knowledge.', strengths: ['Analytical and conceptually flexible', 'Objective and logic-driven', 'Original and imaginative', 'Independent thinker'], challenges: ['May neglect practical details', 'Can be disorganised in execution', 'Dislikes rigid schedules', 'Struggles with small talk'], careers: ['Data Scientist', 'Theoretical Physicist', 'Software Architect', 'Research Analyst', 'Mathematician'] },
  ENTJ: { title: 'The Commander', profile: 'Bold, imaginative and strong-willed leaders, always finding a way.', strengths: ['Natural leadership and decisiveness', 'Efficient and goal-oriented', 'Strategic planner', 'Self-confident and assertive'], challenges: ['Can be impatient with inefficiency', 'May appear domineering or stubborn', 'Dislikes sentiment in decisions', 'Overlooks emotional context'], careers: ['CEO / Senior Executive', 'Project Manager', 'Management Consultant', 'Lawyer', 'Entrepreneur'] },
  ENTP: { title: 'The Debater', profile: 'Smart and curious thinkers who cannot resist an intellectual challenge.', strengths: ['Quick and original thinker', 'Excellent brainstormer', 'Energised by new ideas', 'Confident communicator'], challenges: ['May jump between projects', 'Dislikes routine maintenance', 'Can argue for sport', 'May overlook execution'], careers: ['Entrepreneur', 'Patent Attorney', 'Product Manager', 'Marketing Strategist', 'R&D Lead'] },
  INFJ: { title: 'The Advocate', profile: 'Quiet and mystical, yet inspiring and tireless idealists.', strengths: ['Insightful and visionary', 'Empathic listener', 'Strong value-driven purpose', 'Creative problem-solver'], challenges: ['Prone to burnout', 'Overly idealistic', 'Dislikes conflict', 'Private and hard to read'], careers: ['Counsellor / Therapist', 'UX Researcher', 'Writer', 'NGO Leader', 'Educational Psychologist'] },
  INFP: { title: 'The Mediator', profile: 'Poetic, kind and altruistic souls, always eager to help a good cause.', strengths: ['Empathic and compassionate', 'Creative and imaginative', 'Values-aligned and loyal', 'Open-minded communicator'], challenges: ['Takes criticism personally', 'Idealistic to a fault', 'Dislikes routine work', 'May procrastinate on details'], careers: ['Author / Poet', 'Counsellor', 'Graphic Designer', 'Social Worker', 'HR Specialist'] },
  ENFJ: { title: 'The Protagonist', profile: 'Charismatic and inspiring leaders, able to mesmerise listeners.', strengths: ['Inspiring and persuasive', 'Empathic and supportive', 'Reliable and organised', 'Strong interpersonal skills'], challenges: ['Over-commits emotionally', 'Sensitive to criticism', 'May idealise others', 'Decisive but can be pushy'], careers: ['Teacher / Educator', 'Diplomat', 'Coach', 'PR Manager', 'HR Director'] },
  ENFP: { title: 'The Campaigner', profile: 'Enthusiastic, creative and sociable free spirits, finding a path everywhere.', strengths: ['Enthusiastic and curious', 'Excellent communicator', 'Creative and imaginative', 'Warm and supportive'], challenges: ['Dislikes routine', 'May lose focus', 'People-pleasing tendencies', 'Overthinks under stress'], careers: ['Marketing Manager', 'Journalist', 'Event Planner', 'Brand Strategist', 'Therapist'] },
  ISTJ: { title: 'The Logistician', profile: 'Practical and fact-minded, reliable and steadfast.', strengths: ['Reliable and dependable', 'Detail-oriented', 'Organised and methodical', 'Honours commitments'], challenges: ['Resistant to change', 'May appear judgmental', 'Dislikes abstract theory', 'Struggles with empathy cues'], careers: ['Auditor / Accountant', 'Civil Engineer', 'Logistics Manager', 'Military Officer', 'Database Administrator'] },
  ISFJ: { title: 'The Defender', profile: 'Warm-hearted and dedicated, always ready to protect loved ones.', strengths: ['Supportive and reliable', 'Observant and detail-oriented', 'Loyal and patient', 'Practical and grounded'], challenges: ['Dislikes confrontation', 'Over-extends for others', 'Resistant to change', 'Internalises stress'], careers: ['Nurse', 'Teacher', 'Social Worker', 'Office Manager', 'Paralegal'] },
  ESTJ: { title: 'The Executive', profile: 'Excellent administrators, unsurpassed at managing things or people.', strengths: ['Organised and efficient', 'Decisive leader', 'Strong sense of duty', 'Direct and reliable'], challenges: ['Inflexible with rules', 'May appear bossy', 'Dislikes abstract debates', 'Impatient with inefficiency'], careers: ['Operations Manager', 'Bank Manager', 'Judge', 'School Principal', 'Project Manager'] },
  ESFJ: { title: 'The Consul', profile: 'Caring, social and popular, always eager to help.', strengths: ['Warm and supportive', 'Strong sense of duty', 'Loyal team player', 'Organised and practical'], challenges: ['Sensitive to criticism', 'Concerned with social approval', 'Dislikes conflict', 'May be inflexible'], careers: ['Customer Success Manager', 'Event Coordinator', 'HR Generalist', 'Nurse', 'Teacher'] },
  ISTP: { title: 'The Virtuoso', profile: 'Bold and practical experimenters, masters of all kinds of tools.', strengths: ['Practical and analytical', 'Crisis-resilient', 'Hands-on problem solver', 'Independent and adaptable'], challenges: ['Dislikes long-term planning', 'Private and hard to read', 'May ignore rules', 'Easily bored'], careers: ['Mechanical Engineer', 'Pilot', 'Surgeon', 'Forensic Analyst', 'Software Developer'] },
  ISFP: { title: 'The Adventurer', profile: 'Flexible and charming artists, always ready to explore new things.', strengths: ['Creative and aesthetic', 'Sensitive and empathic', 'Adaptable and easy-going', 'Strong personal values'], challenges: ['Dislikes long-term planning', 'Takes criticism hard', 'May avoid conflict', 'Struggles with structure'], careers: ['Designer', 'Artist', 'Veterinary Assistant', 'Musician', 'Occupational Therapist'] },
  ESTP: { title: 'The Entrepreneur', profile: 'Smart, energetic and perceptive, genuinely enjoying living on the edge.', strengths: ['Energetic and action-oriented', 'Sharp observer', 'Persuasive negotiator', 'Adaptable in a crisis'], challenges: ['Impatient with theory', 'May take undue risks', 'Dislikes routine', 'May miss long-term impact'], careers: ['Sales Manager', 'Paramedic', 'Stock Trader', 'Detective', 'Sports Coach'] },
  ESFP: { title: 'The Entertainer', profile: 'Spontaneous, energetic and enthusiastic - life is never boring around them.', strengths: ['Sociable and warm', 'Practical and observant', 'Adaptable and spontaneous', 'Strong aesthetic sense'], challenges: ['Dislikes academic theory', 'May avoid long-term planning', 'Sensitive to criticism', 'Easily distracted'], careers: ['Event Planner', 'Performer', 'Tour Guide', 'Sales Representative', 'Pre-school Teacher'] },
}

/**
 * RIASEC cluster database — used by the Ideal Career report. Each cluster is
 * keyed by its RIASEC letter code (R, I, A, S, E, C) and contains a short
 * description plus a sample of representative careers.
 */
const RIASEC_CLUSTERS: Record<string, {
  code: string
  name: string
  description: string
  careers: string[]
}> = {
  R: {
    code: 'R', name: 'Realistic - Doers',
    description: 'Realistic types prefer working with tools, machines, animals or outdoor environments. They enjoy physical activity, mechanical tasks and tangible results. Work settings that suit them include construction sites, factories, workshops, sports facilities and field-based roles.',
    careers: ['Mechanical Engineer', 'Civil Engineer', 'Architect', 'Pilot', 'Agricultural Manager', 'Electrician', 'Forensic Technician', 'Athlete / Coach'],
  },
  I: {
    code: 'I', name: 'Investigative - Thinkers',
    description: 'Investigative types thrive on analytical, scientific and intellectual challenges. They enjoy research, problem solving and discovering how things work. Work settings that suit them include research labs, universities, hospitals and analytics teams.',
    careers: ['Research Scientist', 'Data Scientist', 'Software Engineer', 'Doctor / Physician', 'Economist', 'Biotechnologist', 'Forensic Analyst', 'Statistical Analyst'],
  },
  A: {
    code: 'A', name: 'Artistic - Creators',
    description: 'Artistic types value self-expression, creativity and originality. They enjoy writing, design, music, performance and visual storytelling. Work settings that suit them include studios, media houses, advertising agencies and content production teams.',
    careers: ['Graphic Designer', 'UX / UI Designer', 'Author / Writer', 'Filmmaker', 'Music Composer', 'Art Director', 'Game Designer', 'Architectural Visualiser'],
  },
  S: {
    code: 'S', name: 'Social - Helpers',
    description: 'Social types are drawn to helping, teaching, counselling and caring for others. They excel in roles that require empathy, communication and nurturing. Work settings that suit them include schools, hospitals, counselling centres and HR teams.',
    careers: ['Teacher / Educator', 'Counsellor / Therapist', 'HR Manager', 'Nurse', 'Social Worker', 'Speech Therapist', 'Training Specialist', 'Customer Success Lead'],
  },
  E: {
    code: 'E', name: 'Enterprising - Persuaders',
    description: 'Enterprising types enjoy leading, persuading and managing people and projects. They are energised by goals, competition and influence. Work settings that suit them include boardrooms, sales floors, political offices and entrepreneurial ventures.',
    careers: ['Business Manager', 'Sales Director', 'Marketing Manager', 'Politician', 'Entrepreneur', 'Real Estate Manager', 'Lawyer', 'Project Lead'],
  },
  C: {
    code: 'C', name: 'Conventional - Organisers',
    description: 'Conventional types prefer structured, organised and detail-oriented work. They excel at managing records, data, money and processes. Work settings that suit them include banks, accounting firms, government offices and corporate back-offices.',
    careers: ['Chartered Accountant', 'Financial Analyst', 'Auditor', 'Bank Officer', 'Operations Manager', 'Compliance Officer', 'Data Entry Supervisor', 'Logistics Coordinator'],
  },
}

// ---------------------------------------------------------------------------
// Shared PDF context object
// ---------------------------------------------------------------------------

interface PdfCtx {
  doc: PDFDocument
  font: PDFFont
  fontBold: PDFFont
  pageW: number
  pageH: number
  margin: number
  contentW: number
  page: PDFPage
  y: number
  pn: number
  pages: PDFPage[]
  // student / assessment metadata used for header + footer
  studentName: string
  footerTitle: string
}

/**
 * Build a fresh PdfCtx for the given page geometry. Embeds Helvetica +
 * Helvetica-Bold, draws the first page, and stamps the first header/footer.
 */
async function newCtx(opts: {
  pageW: number
  pageH: number
  margin: number
  studentName: string
  footerTitle: string
}): Promise<PdfCtx> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([opts.pageW, opts.pageH])
  const ctx: PdfCtx = {
    doc, font, fontBold,
    pageW: opts.pageW, pageH: opts.pageH,
    margin: opts.margin,
    contentW: opts.pageW - 2 * opts.margin,
    page, y: opts.pageH - opts.margin - 6, pn: 1, pages: [page],
    studentName: opts.studentName, footerTitle: opts.footerTitle,
  }
  drawHF(ctx)
  return ctx
}

/** Stamp the header bar and footer line on the current page. */
function drawHF(ctx: PdfCtx): void {
  const { page, pageW, pageH, margin, font, fontBold, pn, studentName, footerTitle } = ctx
  // Header — navy bar with student name on the left and report title on right
  page.drawRectangle({ x: 0, y: pageH - 36, width: pageW, height: 36, color: C.NAVY })
  page.drawText(sanitize(studentName || 'Student'), {
    x: margin, y: pageH - 23, size: 9.5, font: fontBold, color: C.WHITE,
  })
  const titleW = font.widthOfTextAtSize(sanitize(footerTitle), 9)
  page.drawText(sanitize(footerTitle), {
    x: pageW - margin - titleW, y: pageH - 23, size: 9, font, color: C.WHITE,
  })
  // Footer — thin divider + copyright + page number
  page.drawLine({
    start: { x: margin, y: 28 }, end: { x: pageW - margin, y: 28 },
    thickness: 0.4, color: C.BORDER,
  })
  const footerLeft = `Psychometric Career Assessment | Copyright 2023 (c) Aptitude Test. All Right Reserved.`
  page.drawText(footerLeft, { x: margin, y: 18, size: 7, font, color: C.MUTED })
  const pageLabel = `| ${sanitize(studentName)} | Page-${pn}`
  const pageLabelW = font.widthOfTextAtSize(pageLabel, 7)
  page.drawText(pageLabel, {
    x: pageW - margin - pageLabelW, y: 18, size: 7, font, color: C.MUTED,
  })
}

/** Append a fresh page to the document, stamp header/footer, reset y. */
function addPage(ctx: PdfCtx): void {
  ctx.page = ctx.doc.addPage([ctx.pageW, ctx.pageH])
  ctx.pages.push(ctx.page)
  ctx.pn++
  ctx.y = ctx.pageH - ctx.margin - 6
  drawHF(ctx)
}

/** Add a new page if remaining vertical space is less than `needed`. */
function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y - needed < 50) addPage(ctx)
}

/** Draw wrapped text at current y, advancing y per line. */
function drawText(
  ctx: PdfCtx,
  text: string,
  opts: { x?: number; size?: number; font?: PDFFont; color?: any; maxWidth?: number; lineHeight?: number } = {},
): void {
  const sz = opts.size ?? 10
  const f = opts.font ?? ctx.font
  const col = opts.color ?? C.SLATE
  const maxW = opts.maxWidth ?? ctx.contentW
  const lh = opts.lineHeight ?? sz + 2
  const x = opts.x ?? ctx.margin
  for (const line of wrapText(text, f, sz, maxW)) {
    ensureSpace(ctx, lh)
    ctx.page.drawText(line, { x, y: ctx.y - sz, size: sz, font: f, color: col })
    ctx.y -= lh
  }
}

/** Draw a bold heading; advances y. */
function heading(ctx: PdfCtx, text: string, size = 14, color: any = C.TEAL): void {
  ensureSpace(ctx, size + 8)
  ctx.page.drawText(sanitize(text), {
    x: ctx.margin, y: ctx.y - size, size, font: ctx.fontBold, color,
  })
  ctx.y -= size + 6
}

/** Subtract vertical space. */
function spacer(ctx: PdfCtx, h = 8): void { ctx.y -= h }

/**
 * Render a horizontal bar chart given rows of { label, value0..100, color }.
 * Used by the stream selector (aptitude + interest) and MI reports.
 */
function drawBarChart(
  ctx: PdfCtx,
  rows: { label: string; bars: { value: number; color: any; label?: string }[] }[],
  opts: { labelW?: number; rowH?: number; valueMax?: number } = {},
): void {
  const labelW = opts.labelW ?? 130
  const rowH = opts.rowH ?? 22
  const valueMax = opts.valueMax ?? 100
  const barAreaW = ctx.contentW - labelW - 50
  const barCount = rows[0]?.bars.length || 1
  const barW = (barAreaW - (barCount - 1) * 4) / Math.max(1, barCount)
  rows.forEach((row, i) => {
    const ry = ctx.y - i * rowH
    ensureSpace(ctx, rowH)
    ctx.page.drawText(sanitize(row.label).slice(0, 26), {
      x: ctx.margin, y: ry - 10, size: 8, font: ctx.font, color: C.SLATE,
    })
    row.bars.forEach((bar, bi) => {
      const bx = ctx.margin + labelW + bi * (barW + 4)
      ctx.page.drawRectangle({
        x: bx, y: ry - 12, width: barW, height: 10,
        color: hex('#E2E8F0'),
      })
      const w = Math.max(1, barW * Math.min(1, (bar.value || 0) / valueMax))
      ctx.page.drawRectangle({
        x: bx, y: ry - 12, width: w, height: 10, color: bar.color,
      })
      if (bar.label) {
        ctx.page.drawText(bar.label, {
          x: bx + w + 2, y: ry - 10, size: 7, font: ctx.fontBold, color: C.SLATE,
        })
      }
    })
  })
  ctx.y -= rows.length * rowH + 8
}

// ---------------------------------------------------------------------------
// Generic ReportData shape (matches the task spec)
// ---------------------------------------------------------------------------

export interface ReportData {
  reportId: string
  student: { name: string; email: string; phone?: string | null }
  assessment: { title: string; slug: string; purpose: string; category: string }
  attempt: { startedAt?: string; completedAt?: string }
  score: {
    dimensions: Array<{
      code: string; name: string; score: number; maxScore: number;
      pct: number; level: string; description: string;
      strengths?: string[]; developmentAreas?: string[];
      dimensionDescription?: string;
    }>
    recommendation?: string
    topDimensions?: string[]
    domainBreakdown?: Array<{
      code: string; title: string; aptitude: number; interest: number; composite: number;
    }>
  }
}

// ===========================================================================
// 1. STREAM SELECTOR REPORT (A4 - 595x842)
// ===========================================================================

/**
 * Stream Selector report — mirrors the reference "Stream Selector.pdf":
 *   Page 1: student info + intro + ranking table + disclaimer + footer
 *   Page 2: bar chart (aptitude vs interest) + interpretation text
 *   Pages 3-6: one page per stream with description, advantages, courses,
 *              and a personalised commentary on aptitude/interest.
 */
export async function generateStreamSelectorReport(data: ReportData, outPath: string): Promise<string> {
  const PAGE_W = 595
  const PAGE_H = 842
  const MARGIN = 51
  const ctx = await newCtx({
    pageW: PAGE_W, pageH: PAGE_H, margin: MARGIN,
    studentName: data.student?.name || 'Student',
    footerTitle: 'Stream Selector Report',
  })

  // Load stream content database (descriptions, advantages, courses)
  const streamJson = loadData<any>('stream-selector')
  const STREAM_DB: Record<string, any> = streamJson?.STREAM_DATABASE || {}

  // Pull domain breakdown (aptitude / interest / composite per stream)
  const breakdown = (data.score?.domainBreakdown || []).slice().sort(
    (a, b) => (b.composite || 0) - (a.composite || 0),
  )
  // Fallback: derive 4 synthetic streams if breakdown is empty
  const streams = breakdown.length
    ? breakdown
    : [
        { code: 'sci_math', title: STREAM_DB.sci_math?.title || 'Science (Maths)', aptitude: 0, interest: 0, composite: 0 },
        { code: 'commerce', title: STREAM_DB.commerce?.title || 'Commerce', aptitude: 0, interest: 0, composite: 0 },
        { code: 'sci_bio', title: STREAM_DB.sci_bio?.title || 'Science (Bio)', aptitude: 0, interest: 0, composite: 0 },
        { code: 'humanities', title: STREAM_DB.humanities?.title || 'Humanities', aptitude: 0, interest: 0, composite: 0 },
      ]

  // ---- PAGE 1 -------------------------------------------------------------
  ctx.page.drawText('Stream Selector Test Report', {
    x: ctx.margin, y: ctx.y - 20, size: 20, font: ctx.fontBold, color: C.NAVY,
  })
  ctx.y -= 28
  ctx.page.drawText(sanitize(data.student?.name || ''), {
    x: ctx.margin, y: ctx.y - 12, size: 12, font: ctx.fontBold, color: C.TEAL,
  })
  ctx.y -= 18

  // Student info row
  const phone = data.student?.phone || '-'
  const email = data.student?.email || '-'
  const dateStr = fmtDate(data.attempt?.completedAt || data.attempt?.startedAt)
  const infoRows: [string, string][] = [
    ['Student Name', sanitize(data.student?.name || '')],
    ['Phone', sanitize(phone)],
    ['Email', sanitize(email)],
    ['Date', dateStr],
  ]
  infoRows.forEach(([k, v]) => {
    ensureSpace(ctx, 16)
    ctx.page.drawText(`${k}:`, { x: ctx.margin, y: ctx.y - 10, size: 9, font: ctx.fontBold, color: C.MUTED })
    const vText = String(v)
    ctx.page.drawText(vText, { x: ctx.margin + 95, y: ctx.y - 10, size: 9, font: ctx.font, color: C.SLATE })
    ctx.y -= 14
  })
  spacer(ctx, 8)

  // Intro text about stream selection
  heading(ctx, 'About This Report')
  drawText(ctx, 'Choosing the right stream after Class 10 is one of the most important academic decisions a student makes. The Stream Selector Test combines an aptitude assessment (your capability across quantitative, verbal, analytical and spatial domains) with an interest inventory (your genuine curiosity toward subject areas), and produces a composite recommendation across four major streams: Science (Maths), Science (Bio), Commerce and Humanities. The report below ranks the four streams from strongest to weakest fit, provides a visual comparison of aptitude versus interest for each stream, and then dedicates a full page to each stream with its description, advantages and the courses you can pursue.')
  spacer(ctx, 8)

  // Stream ranking table
  heading(ctx, 'Your Stream Ranking')
  const rankRows = streams.map((s, i) => ({
    rank: i + 1, title: s.title || s.code,
    apt: s.aptitude || 0, int: s.interest || 0, comp: s.composite || 0,
  }))
  const colW = [30, ctx.contentW - 30 - 40 - 40 - 50, 40, 40, 50]
  const headers = ['Rank', 'Stream', 'Apt', 'Int', 'Comp']
  ensureSpace(ctx, 22)
  ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 18, width: ctx.contentW, height: 20, color: C.NAVY })
  let bx = ctx.margin
  headers.forEach((h, i) => {
    ctx.page.drawText(h, { x: bx + 5, y: ctx.y - 13, size: 9, font: ctx.fontBold, color: C.WHITE })
    bx += colW[i]
  })
  ctx.y -= 20
  rankRows.forEach((r, i) => {
    ensureSpace(ctx, 22)
    if (i % 2 === 1) ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 18, width: ctx.contentW, height: 20, color: C.LIGHT })
    const cells = [String(r.rank), sanitize(r.title).slice(0, 28), String(r.apt), String(r.int), String(r.comp)]
    bx = ctx.margin
    cells.forEach((c, j) => {
      ctx.page.drawText(c, {
        x: bx + 5, y: ctx.y - 13,
        size: 9, font: j === 4 ? ctx.fontBold : ctx.font, color: C.SLATE,
      })
      bx += colW[j]
    })
    ctx.y -= 20
  })
  spacer(ctx, 10)

  // Disclaimer
  heading(ctx, 'Disclaimer', 11, C.AMBER)
  drawText(ctx, 'This Stream Selector report is intended for guidance only and reflects the responses provided during the assessment. Stream selection should ideally be discussed with parents, teachers and a qualified career counsellor, taking into account academic performance, long-term goals and personal interests.', { size: 8.5, color: C.MUTED })

  // ---- PAGE 2 -------------------------------------------------------------
  addPage(ctx)
  heading(ctx, 'Aptitude vs Interest Comparison')
  drawText(ctx, 'A strong stream recommendation requires BOTH aptitude (your natural capability) and interest (your genuine curiosity) to be high. A stream where you have high interest but low aptitude may be challenging academically, while a stream where you have high aptitude but low interest may lead to disengagement over time.')
  spacer(ctx, 8)
  const chartRows = streams.map(s => ({
    label: s.title || s.code,
    bars: [
      { value: s.aptitude || 0, color: C.NAVY, label: `${s.aptitude || 0}` },
      { value: s.interest || 0, color: C.TEAL, label: `${s.interest || 0}` },
    ],
  }))
  drawBarChart(ctx, chartRows, { labelW: 110, rowH: 26 })
  spacer(ctx, 6)
  // Legend
  ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 10, width: 12, height: 8, color: C.NAVY })
  ctx.page.drawText('Aptitude', { x: ctx.margin + 16, y: ctx.y - 9, size: 9, font: ctx.font, color: C.SLATE })
  ctx.page.drawRectangle({ x: ctx.margin + 90, y: ctx.y - 10, width: 12, height: 8, color: C.TEAL })
  ctx.page.drawText('Interest', { x: ctx.margin + 106, y: ctx.y - 9, size: 9, font: ctx.font, color: C.SLATE })
  ctx.y -= 22
  spacer(ctx, 8)

  heading(ctx, 'How To Read The Chart')
  drawText(ctx, 'Aptitude is measured by your performance on numerical, verbal, analytical and spatial reasoning items. Interest is measured by your agreement with statements about each subject domain. The composite score weights both factors and drives the overall ranking on page 1. Streams where aptitude and interest are both above 60 are your strongest fits.')
  spacer(ctx, 6)
  drawText(ctx, 'If your top stream has a notable gap between aptitude and interest, discuss with a counsellor whether to lean toward the stream where BOTH factors are balanced rather than where one factor dominates.')

  // ---- PAGES 3-6: one page per stream ------------------------------------
  streams.forEach((s, idx) => {
    addPage(ctx)
    const dbRow = STREAM_DB[s.code] || {}
    const title = dbRow.title || s.title || s.code
    const subtitle = dbRow.subtitle || ''
    const description = dbRow.description || ''
    const advantages: string[] = dbRow.advantages || []
    const coursesTitle = dbRow.coursesTitle || 'Top Graduate Level Courses'
    const courses: Array<{ name: string; duration: string }> = dbRow.courses || []

    // Big rank number + title banner
    ensureSpace(ctx, 60)
    ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 50, width: ctx.contentW, height: 50, color: idx === 0 ? C.TEAL : (idx === 1 ? C.NAVY : (idx === 2 ? C.PLUM : C.AMBER)) })
    ctx.page.drawText(`#${idx + 1}`, {
      x: ctx.margin + 12, y: ctx.y - 32, size: 24, font: ctx.fontBold, color: C.WHITE,
    })
    ctx.page.drawText(sanitize(title), {
      x: ctx.margin + 60, y: ctx.y - 22, size: 16, font: ctx.fontBold, color: C.WHITE,
    })
    if (subtitle) {
      ctx.page.drawText(sanitize(subtitle), {
        x: ctx.margin + 60, y: ctx.y - 38, size: 9, font: ctx.font, color: C.WHITE,
      })
    }
    ctx.y -= 62

    // Description
    heading(ctx, 'About This Stream', 12, C.NAVY)
    drawText(ctx, description || 'No description available.', { size: 9.5 })
    spacer(ctx, 6)

    // Advantages
    if (advantages.length) {
      heading(ctx, 'Advantages', 12, C.TEAL)
      advantages.forEach(a => drawText(ctx, `* ${a}`, { size: 9.5, maxWidth: ctx.contentW - 12 }))
      spacer(ctx, 6)
    }

    // Courses
    if (courses.length) {
      heading(ctx, coursesTitle, 12, C.NAVY)
      const courseCols = 2
      const courseColW = (ctx.contentW - 10) / courseCols
      const rowH = 18
      courses.forEach((c, i) => {
        ensureSpace(ctx, rowH)
        const col = i % courseCols
        const row = Math.floor(i / courseCols)
        const cx = ctx.margin + col * courseColW
        const cy = ctx.y - row * rowH
        ctx.page.drawText(`- ${sanitize(c.name)}`, {
          x: cx, y: cy - 10, size: 8.5, font: ctx.font, color: C.SLATE,
        })
        ctx.page.drawText(sanitize(c.duration || ''), {
          x: cx + courseColW - 30, y: cy - 10, size: 8, font: ctx.font, color: C.MUTED,
        })
      })
      const rows = Math.ceil(courses.length / courseCols)
      ctx.y -= rows * rowH + 4
      spacer(ctx, 6)
    }

    // Personalised commentary on aptitude / interest scores
    heading(ctx, 'Your Fit Commentary', 12, C.TEAL)
    const apt = s.aptitude || 0
    const int = s.interest || 0
    const comp = s.composite || 0
    let commentary = ''
    if (apt >= 60 && int >= 60) {
      commentary = `Your results indicate both strong aptitude (${apt}) and strong interest (${int}) in ${title}, producing a composite score of ${comp}. This is an excellent fit and you should seriously consider this stream as a primary option.`
    } else if (apt >= 60 && int < 60) {
      commentary = `You have strong aptitude (${apt}) in ${title} but a moderate or lower interest (${int}). You would likely perform well academically in this stream, but should explore the subjects and career paths below to confirm your genuine curiosity before committing.`
    } else if (apt < 60 && int >= 60) {
      commentary = `You have strong interest (${int}) in ${title} but a moderate or lower aptitude (${apt}). You may need to work harder initially, but passion often drives long-term success. Consider bridge courses or coaching to build the skills required.`
    } else {
      commentary = `Both your aptitude (${apt}) and interest (${int}) in ${title} are moderate or lower. This may not be your strongest fit, but it remains worth exploring if you have a clear vocational goal aligned with this stream.`
    }
    drawText(ctx, commentary, { size: 9.5, maxWidth: ctx.contentW - 4 })
    spacer(ctx, 6)
  })

  return await finishDoc(ctx, outPath, `Stream Selector Report - ${data.student?.name}`)
}

// ===========================================================================
// 2. PERSONALITY REPORT (Letter - 612x792)
// ===========================================================================

/**
 * Personality Type report — mirrors the reference "Personality Type.pdf":
 *   Page 1: student info + "Your Personality" heading + 4-letter type code
 *   Pages 2-5: one page per dichotomy (I/E, S/N, T/F, J/P) with a two-column
 *              trait comparison table.
 *   Page 6: "Your Personality Profile" — full-paragraph description.
 *   Page 7+: strengths / challenges checklists + career recommendations.
 */
export async function generatePersonalityReport(data: ReportData, outPath: string): Promise<string> {
  const PAGE_W = 612
  const PAGE_H = 792
  const MARGIN = 50
  const ctx = await newCtx({
    pageW: PAGE_W, pageH: PAGE_H, margin: MARGIN,
    studentName: data.student?.name || 'Student',
    footerTitle: 'Personality Type Report',
  })

  // Build dimension score lookup. Expected dimensions: E, I, S, N, T, F, J, P
  const dims: Record<string, number> = {}
  for (const d of data.score?.dimensions || []) {
    dims[d.code.toUpperCase()] = d.score || 0
  }
  // Determine each pole's preference
  const pref = (a: string, b: string) => (dims[a] || 0) >= (dims[b] || 0) ? a : b
  const letters: string[] = [
    pref('E', 'I'),
    pref('S', 'N'),
    pref('T', 'F'),
    pref('J', 'P'),
  ]
  const typeCode = letters.join('')
  const profile = PERSONALITY_PROFILES[typeCode] || {
    title: 'Your Personality Type',
    profile: 'Your responses indicate a balanced personality profile that draws from multiple dichotomies. Continue reflecting on how each preference shows up in your daily decisions.',
    strengths: ['Adaptive across situations', 'Comfortable with both structure and flexibility', 'Able to reason both logically and empathically'],
    challenges: ['May find it harder to commit to a single approach', 'Can feel pulled in different directions'],
    careers: ['Generalist roles across fields', 'Cross-functional team lead', 'Project coordinator'],
  }

  // ---- PAGE 1 -------------------------------------------------------------
  ctx.page.drawText('Personality Type Report', {
    x: ctx.margin, y: ctx.y - 20, size: 20, font: ctx.fontBold, color: C.NAVY,
  })
  ctx.y -= 28
  drawText(ctx, `Student Name: ${sanitize(data.student?.name || '')}`, { size: 11, color: C.SLATE, font: ctx.fontBold })
  drawText(ctx, `Date: ${fmtDate(data.attempt?.completedAt || data.attempt?.startedAt)}`, { size: 11, color: C.SLATE })
  spacer(ctx, 12)

  heading(ctx, 'Your Personality', 16, C.NAVY)
  // Type code in a large coloured box
  ensureSpace(ctx, 80)
  ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 70, width: ctx.contentW, height: 70, color: C.TEAL })
  ctx.page.drawText(typeCode, {
    x: ctx.margin + 24, y: ctx.y - 50, size: 40, font: ctx.fontBold, color: C.WHITE,
  })
  ctx.page.drawText(sanitize(profile.title), {
    x: ctx.margin + 180, y: ctx.y - 34, size: 14, font: ctx.fontBold, color: C.WHITE,
  })
  ctx.page.drawText(sanitize(profile.profile), {
    x: ctx.margin + 180, y: ctx.y - 54, size: 8.5, font: ctx.font, color: C.WHITE, maxWidth: ctx.contentW - 200,
  })
  ctx.y -= 86
  spacer(ctx, 10)

  // Intro paragraph
  heading(ctx, 'About the Personality Assessment')
  drawText(ctx, 'This report is based on the four dichotomies of personality preferences: Extraversion vs Introversion (E/I), Sensing vs Intuition (S/N), Thinking vs Feeling (T/F) and Judging vs Perceiving (J/P). Each dichotomy describes how you direct your energy, take in information, make decisions and organise your life. The following pages present each dichotomy with a side-by-side comparison of the two poles and your indicated preference.')

  // ---- PAGES 2-5: dichotomy pages -----------------------------------------
  const dichotomies = [
    {
      key: 'E/I', title: 'Energy & Focus: Extraversion (E) vs Introversion (I)',
      intro: 'This dichotomy describes where you draw your energy from and how you prefer to direct your attention.',
      left: { code: 'E', name: 'Extraversion', traits: ['Energised by people and activity', 'Prefers talking through ideas', 'Broad social network', 'Acts first, reflects later', 'Comfortable in the spotlight'] },
      right: { code: 'I', name: 'Introversion', traits: ['Energised by solitude and reflection', 'Prefers written communication', 'Deep, focused relationships', 'Reflects first, then acts', 'Comfortable behind the scenes'] },
      prefLetter: letters[0],
    },
    {
      key: 'S/N', title: 'Information & Perception: Sensing (S) vs Intuition (N)',
      intro: 'This dichotomy describes how you take in information and what you naturally pay attention to.',
      left: { code: 'S', name: 'Sensing', traits: ['Focuses on concrete facts', 'Trusts past experience', 'Step-by-step approach', 'Detail-oriented', 'Practical and realistic'] },
      right: { code: 'N', name: 'Intuition', traits: ['Focuses on patterns and ideas', 'Imagines future possibilities', 'Big-picture approach', 'Conceptual and abstract', 'Innovative and theoretical'] },
      prefLetter: letters[1],
    },
    {
      key: 'T/F', title: 'Decision Making: Thinking (T) vs Feeling (F)',
      intro: 'This dichotomy describes how you make decisions and evaluate options.',
      left: { code: 'T', name: 'Thinking', traits: ['Decides based on logic', 'Objective analysis', 'Values fairness and truth', 'Direct and candid', 'Driven by principles'] },
      right: { code: 'F', name: 'Feeling', traits: ['Decides based on values', 'Empathic consideration', 'Values harmony and people', 'Diplomatic and warm', 'Driven by impact on others'] },
      prefLetter: letters[2],
    },
    {
      key: 'J/P', title: 'Lifestyle & Action: Judging (J) vs Perceiving (P)',
      intro: 'This dichotomy describes how you organise your life, work and time.',
      left: { code: 'J', name: 'Judging', traits: ['Prefers structure and plans', 'Goal-oriented and decisive', 'Dislikes last-minute changes', 'Lists and schedules', 'Completes tasks early'] },
      right: { code: 'P', name: 'Perceiving', traits: ['Prefers flexibility and options', 'Adapts to changing situations', 'Spontaneous and curious', 'Open-ended timelines', 'Energised by deadlines'] },
      prefLetter: letters[3],
    },
  ]
  dichotomies.forEach(d => {
    addPage(ctx)
    heading(ctx, d.title, 14, C.TEAL)
    drawText(ctx, d.intro, { size: 10 })
    spacer(ctx, 8)
    // Scores row
    const leftScore = dims[d.left.code] || 0
    const rightScore = dims[d.right.code] || 0
    drawText(ctx, `Your scores: ${d.left.code} = ${leftScore} | ${d.right.code} = ${rightScore}. Indicated preference: ${d.prefLetter}.`, {
      size: 10, color: C.NAVY, font: ctx.fontBold,
    })
    spacer(ctx, 10)

    // Two-column comparison table
    const colW = (ctx.contentW - 10) / 2
    // Header row
    ensureSpace(ctx, 28)
    const headerY = ctx.y
    ctx.page.drawRectangle({ x: ctx.margin, y: headerY - 22, width: colW, height: 22, color: d.prefLetter === d.left.code ? C.TEAL : C.MUTED })
    ctx.page.drawRectangle({ x: ctx.margin + colW + 10, y: headerY - 22, width: colW, height: 22, color: d.prefLetter === d.right.code ? C.TEAL : C.MUTED })
    ctx.page.drawText(`${d.left.code} - ${sanitize(d.left.name)}`, {
      x: ctx.margin + 8, y: headerY - 16, size: 11, font: ctx.fontBold, color: C.WHITE,
    })
    ctx.page.drawText(`${d.right.code} - ${sanitize(d.right.name)}`, {
      x: ctx.margin + colW + 18, y: headerY - 16, size: 11, font: ctx.fontBold, color: C.WHITE,
    })
    ctx.y -= 26
    // Trait rows
    const rowCount = Math.max(d.left.traits.length, d.right.traits.length)
    for (let i = 0; i < rowCount; i++) {
      ensureSpace(ctx, 26)
      const ry = ctx.y
      const rowH = 22
      ctx.page.drawRectangle({ x: ctx.margin, y: ry - 18, width: colW, height: rowH, color: i % 2 === 0 ? C.LIGHT : C.WHITE, borderColor: C.BORDER, borderWidth: 0.25 })
      ctx.page.drawRectangle({ x: ctx.margin + colW + 10, y: ry - 18, width: colW, height: rowH, color: i % 2 === 0 ? C.LIGHT : C.WHITE, borderColor: C.BORDER, borderWidth: 0.25 })
      const lText = d.left.traits[i] || ''
      const rText = d.right.traits[i] || ''
      ctx.page.drawText(sanitize(lText), { x: ctx.margin + 8, y: ry - 12, size: 9, font: ctx.font, color: C.SLATE, maxWidth: colW - 16 })
      ctx.page.drawText(sanitize(rText), { x: ctx.margin + colW + 18, y: ry - 12, size: 9, font: ctx.font, color: C.SLATE, maxWidth: colW - 16 })
      ctx.y -= rowH
    }
    spacer(ctx, 8)
    // Side commentary
    const prefSide = d.prefLetter === d.left.code ? d.left : d.right
    drawText(ctx, `Your preference is ${prefSide.code} - ${prefSide.name}. This means you tend to ${prefSide.traits[0].toLowerCase()}. Remember that both poles are valuable; the goal is not to suppress the non-preferred side but to develop it consciously when the situation calls for it.`, {
      size: 9.5, color: C.SLATE,
    })
  })

  // ---- PAGE 6: profile ----------------------------------------------------
  addPage(ctx)
  heading(ctx, 'Your Personality Profile', 16, C.NAVY)
  ensureSpace(ctx, 60)
  ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 38, width: ctx.contentW, height: 38, color: C.EMERALD_BG })
  ctx.page.drawText(`${typeCode} - ${sanitize(profile.title)}`, {
    x: ctx.margin + 10, y: ctx.y - 14, size: 13, font: ctx.fontBold, color: C.GREEN,
  })
  ctx.page.drawText(`Composite of ${letters.join(' / ')}`, {
    x: ctx.margin + 10, y: ctx.y - 30, size: 9, font: ctx.font, color: C.SLATE,
  })
  ctx.y -= 44
  spacer(ctx, 6)
  drawText(ctx, profile.profile, { size: 10.5, color: C.SLATE })
  spacer(ctx, 8)
  drawText(ctx, `As an ${typeCode}, you bring together the preferences of ${dichotomies.map(d => `${d.prefLetter} (${d.key.split('/')[d.prefLetter === d.left.code ? 0 : 1]})`).join(', ')}. This combination shapes how you interact with the world, the kind of work that energises you and the relationships you find most fulfilling. The descriptions below expand on the strengths you can leverage and the challenges you may need to manage deliberately.`, { size: 10, color: C.SLATE })

  // ---- PAGE 7+: strengths, challenges, careers ---------------------------
  addPage(ctx)
  heading(ctx, 'Your Strengths', 14, C.GREEN)
  profile.strengths.forEach(s => drawText(ctx, `* ${s}`, { size: 10, maxWidth: ctx.contentW - 12, color: C.SLATE }))
  spacer(ctx, 10)
  heading(ctx, 'Areas To Develop', 14, C.AMBER)
  profile.challenges.forEach(s => drawText(ctx, `* ${s}`, { size: 10, maxWidth: ctx.contentW - 12, color: C.SLATE }))
  spacer(ctx, 10)
  heading(ctx, 'Career Recommendations', 14, C.TEAL)
  drawText(ctx, 'Based on your personality profile, the following career directions tend to align well with your natural preferences. Treat this as a starting point for exploration rather than a definitive prescription.', { size: 9.5 })
  spacer(ctx, 4)
  profile.careers.forEach(c => drawText(ctx, `- ${c}`, { size: 10, maxWidth: ctx.contentW - 12, color: C.SLATE }))

  return await finishDoc(ctx, outPath, `Personality Type Report - ${data.student?.name}`)
}

// ===========================================================================
// 3. MULTIPLE INTELLIGENCE REPORT (Letter - 612x792)
// ===========================================================================

/**
 * Multiple Intelligence report — mirrors the reference "Multiple
 * Intelligence.pdf" (22 pages):
 *   Page 1: student info + "Intelligences and You" heading + bar chart of
 *           all intelligence scores (sorted high to low).
 *   Pages 2+: one section per intelligence (sorted by score, highest first),
 *             each with description, strengths, challenges, famous people,
 *             top careers, and a recommendations paragraph.
 */
export async function generateMultipleIntelligenceReport(data: ReportData, outPath: string): Promise<string> {
  const PAGE_W = 612
  const PAGE_H = 792
  const MARGIN = 50
  const ctx = await newCtx({
    pageW: PAGE_W, pageH: PAGE_H, margin: MARGIN,
    studentName: data.student?.name || 'Student',
    footerTitle: 'Multiple Intelligence Report',
  })

  const miJson = loadData<any>('multiple-intelligence')
  const INTEL: Record<string, any> = miJson?.INTEL || {}

  // Build a sorted list of intelligence codes by score (highest first)
  const dims = (data.score?.dimensions || []).slice().sort((a, b) => (b.pct || 0) - (a.pct || 0))
  // If dimensions missing, fall back to the JSON keys in their original order
  const orderedCodes = dims.length
    ? dims.map(d => d.code.toLowerCase())
    : Object.keys(INTEL)

  // ---- PAGE 1 -------------------------------------------------------------
  ctx.page.drawText('Multiple Intelligence Report', {
    x: ctx.margin, y: ctx.y - 20, size: 20, font: ctx.fontBold, color: C.NAVY,
  })
  ctx.y -= 28
  drawText(ctx, `Student Name: ${sanitize(data.student?.name || '')}`, { size: 11, color: C.SLATE, font: ctx.fontBold })
  drawText(ctx, `Date: ${fmtDate(data.attempt?.completedAt || data.attempt?.startedAt)}`, { size: 11, color: C.SLATE })
  spacer(ctx, 12)

  heading(ctx, 'Intelligences and You', 16, C.NAVY)
  drawText(ctx, 'Howard Gardner\'s theory of multiple intelligences proposes that intelligence is not a single, measurable ability but a profile of distinct cognitive strengths. This report ranks your nine intelligences from strongest to weakest, provides a snapshot chart of all scores, and then dedicates a dedicated section to each intelligence with its description, strengths, challenges, famous examples, top careers and personalised recommendations.', { size: 10 })
  spacer(ctx, 10)

  // Bar chart of all intelligence scores
  heading(ctx, 'Your Intelligence Profile', 13, C.TEAL)
  const chartRows = orderedCodes.map(code => {
    const dim = dims.find(d => d.code.toLowerCase() === code)
    const intel = INTEL[code] || {}
    return {
      label: intel.short || intel.name || code,
      bars: [{ value: dim?.pct || 0, color: lvlColor(dim?.level || ''), label: `${dim?.pct || 0}%` }],
    }
  })
  if (chartRows.length) drawBarChart(ctx, chartRows, { labelW: 110, rowH: 18, valueMax: 100 })

  // ---- Pages 2+: per-intelligence sections --------------------------------
  for (const code of orderedCodes) {
    const intel = INTEL[code]
    if (!intel) continue
    const dim = dims.find(d => d.code.toLowerCase() === code)
    addPage(ctx)

    // Section header band
    ensureSpace(ctx, 60)
    ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 50, width: ctx.contentW, height: 50, color: lvlColor(dim?.level || '') })
    ctx.page.drawText(sanitize(intel.name || code), {
      x: ctx.margin + 12, y: ctx.y - 22, size: 15, font: ctx.fontBold, color: C.WHITE,
    })
    const pctLabel = dim ? `${dim.pct || 0}% - ${dim.level || ''}` : ''
    if (pctLabel) {
      const w = ctx.fontBold.widthOfTextAtSize(sanitize(pctLabel), 10)
      ctx.page.drawText(pctLabel, {
        x: ctx.margin + ctx.contentW - w - 12, y: ctx.y - 22, size: 10, font: ctx.fontBold, color: C.WHITE,
      })
    }
    ctx.page.drawText('Multiple Intelligence Section', {
      x: ctx.margin + 12, y: ctx.y - 38, size: 8, font: ctx.font, color: C.WHITE,
    })
    ctx.y -= 62
    spacer(ctx, 6)

    // Description
    heading(ctx, 'Description', 12, C.NAVY)
    drawText(ctx, intel.desc || '', { size: 9.5 })
    spacer(ctx, 6)

    // Strengths
    if (intel.strengths?.length) {
      heading(ctx, 'Strengths', 12, C.GREEN)
      intel.strengths.forEach((s: string) => drawText(ctx, `* ${s}`, { size: 9.5, maxWidth: ctx.contentW - 12, color: C.SLATE }))
      spacer(ctx, 6)
    }

    // Challenges
    if (intel.challenges?.length) {
      heading(ctx, 'Challenges', 12, C.AMBER)
      intel.challenges.forEach((s: string) => drawText(ctx, `* ${s}`, { size: 9.5, maxWidth: ctx.contentW - 12, color: C.SLATE }))
      spacer(ctx, 6)
    }

    // Famous people
    if (intel.famous?.length) {
      heading(ctx, 'Famous People With This Intelligence', 12, C.TEAL)
      intel.famous.forEach((s: string) => drawText(ctx, `- ${s}`, { size: 9.5, maxWidth: ctx.contentW - 12, color: C.SLATE }))
      spacer(ctx, 6)
    }

    // Top careers
    if (intel.careers?.length) {
      heading(ctx, 'Top Careers', 12, C.NAVY)
      intel.careers.forEach((s: string) => drawText(ctx, `- ${s}`, { size: 9.5, maxWidth: ctx.contentW - 12, color: C.SLATE }))
      spacer(ctx, 6)
    }

    // Recommendations / advice
    if (intel.advice) {
      heading(ctx, 'Recommendations', 12, C.TEAL)
      drawText(ctx, intel.advice, { size: 9.5, color: C.SLATE })
    }
  }

  return await finishDoc(ctx, outPath, `Multiple Intelligence Report - ${data.student?.name}`)
}

// ===========================================================================
// 4. LEARNING STYLE REPORT (Letter - 612x792)
// ===========================================================================

/** Embedded per-dimension learning style descriptions + recommendations. */
const LEARNING_STYLE_DB: Record<string, {
  description: string
  low: string
  high: string
}> = {
  Auditory: { description: 'Auditory learners absorb information best through sound - lectures, discussions, audio recordings and verbal explanations.', low: 'You may find it harder to retain information delivered only through spoken word. Pair audio material with written notes, and review key points visually after a lecture.', high: 'You learn well from lectures and discussions. Record sessions, read your notes aloud, and use mnemonic rhymes or verbal repetition to lock in facts.' },
  Kinesthetic: { description: 'Kinesthetic learners learn through whole-body movement and physical engagement with the material.', low: 'Sitting still for long periods may sap your focus less than expected - experiment with note-taking by hand, walking while reciting, or short movement breaks.', high: 'Build movement into your study routine: stand, walk, gesture or use a stress ball. Role-play concepts and act out scenarios to internalise them.' },
  Tactile: { description: 'Tactile learners absorb information through hands-on manipulation - touching, building, disassembling, drawing.', low: 'Purely tactile channels may not be your strongest. Reinforce hands-on learning with diagrams, written summaries or verbal debriefs.', high: 'Use models, manipulatives and experiments whenever possible. Build, draw or construct a physical representation of abstract concepts.' },
  Visual: { description: 'Visual learners process information best when it is presented as images, charts, diagrams and spatial layouts.', low: 'You may find it harder to learn from purely visual material. Convert charts into written summaries or verbal explanations to reinforce understanding.', high: 'Use colour-coded notes, mind maps, flowcharts and infographics. Watch demonstrations and convert text into sketches whenever possible.' },
  Intake: { description: 'The intake dimension reflects whether eating or drinking during study sessions supports or disrupts your focus.', low: 'You focus better without food or drinks during study sessions. Keep snacks for breaks, not while you work.', high: 'Keep healthy snacks and water nearby while you study. Avoid heavy or sugar-rich foods that may cause energy crashes.' },
  Light: { description: 'The light dimension captures how lighting conditions affect your ability to concentrate.', low: 'You study well in dimmer or natural light. Avoid harsh overhead lighting that may cause eye strain or fatigue.', high: 'Ensure bright, well-distributed lighting when studying. Natural daylight or full-spectrum bulbs tend to work best.' },
  Temperature: { description: 'The temperature dimension reflects how thermal comfort affects your concentration.', low: 'You concentrate well in cooler environments. Avoid overheated rooms that may make you drowsy.', high: 'Keep the study space comfortably warm. Layer clothing so you can adjust if the room temperature shifts.' },
  Mobility: { description: 'The mobility dimension captures whether you concentrate best when stationary or when able to move around.', low: 'You concentrate best when settled in one place. Establish a fixed study spot to build focus and routine.', high: 'Take short movement breaks every 25-30 minutes, or alternate between sitting and standing positions.' },
  Sound: { description: 'The sound dimension reflects whether background noise helps or hinders your concentration.', low: 'You need a quiet environment to concentrate. Use earplugs or noise-cancelling headphones in busy spaces.', high: 'Background music, white noise or ambient sounds may help you focus. Avoid lyrics-heavy tracks when reading.' },
  'Physical Setting': { description: 'The physical setting dimension captures whether you prefer formal desk-based study or informal, casual arrangements.', low: 'You prefer a structured desk-and-chair setup. Keep your workspace tidy and well-organised.', high: 'You may concentrate better on a couch, floor cushion or in a casual corner. Experiment to find what feels both comfortable and focused.' },
  'Time of Day': { description: 'The time-of-day dimension captures when your cognitive peak occurs.', low: 'Your focus may dip in the early morning or late evening. Schedule demanding tasks for mid-day when your energy is most stable.', high: 'Identify your peak window (often early morning or late evening) and reserve it for the hardest subjects.' },
  'Teacher Motivation': { description: 'This dimension captures how much external encouragement from a teacher drives your engagement.', low: 'You are largely self-driven. Teachers may not need to actively motivate you, but constructive feedback still matters.', high: 'You respond strongly to teacher enthusiasm and praise. Seek out mentors who actively encourage and challenge you.' },
  Collaborative: { description: 'The collaborative dimension captures whether you learn better alone or with peers.', low: 'You concentrate best when studying alone. Reserve group work for review sessions rather than initial learning.', high: 'Form study groups or pair up with a peer. Explaining concepts aloud to others reinforces your own understanding.' },
  Structure: { description: 'The structure dimension reflects your preference for clearly defined instructions versus open-ended exploration.', low: 'You thrive with open-ended exploration. Use flexible outlines that you can rearrange as your understanding evolves.', high: 'You benefit from clear instructions, rubrics and step-by-step plans. Break tasks into well-defined sub-steps.' },
  Focus: { description: 'The focus dimension captures whether you concentrate best on one task at a time or when multitasking.', low: 'You may tolerate some multitasking. Still, single-tasking tends to produce deeper learning - batch similar tasks instead.', high: 'Avoid multitasking. Use focused study blocks (25-30 min) followed by short breaks to maintain depth.' },
  'Self-Motivation': { description: 'The self-motivation dimension reflects how strongly internal drive pushes your learning.', low: 'External structure may help you stay on track. Use deadlines, accountability partners or public commitments.', high: 'You are strongly self-driven. Channel this by setting ambitious personal goals and tracking progress visibly.' },
}

/**
 * Learning Style report — mirrors the reference "Learning Style.pdf"
 * (~15 pages):
 *   Page 1: student info + intro about learning preferences.
 *   Then grouped by category (Sensory, Environmental, Mindset) - one
 *   section per dimension with description, low/high indicator based on
 *   score, and actionable recommendations.
 */
export async function generateLearningStyleReport(data: ReportData, outPath: string): Promise<string> {
  const PAGE_W = 612
  const PAGE_H = 792
  const MARGIN = 50
  const ctx = await newCtx({
    pageW: PAGE_W, pageH: PAGE_H, margin: MARGIN,
    studentName: data.student?.name || 'Student',
    footerTitle: 'Learning Style Report',
  })

  const lsJson = loadData<any>('learning-style')
  const CATS: Array<{ n: string; type: string }> = lsJson?.CATS || []

  // Build dimension score lookup
  const dims: Record<string, { pct: number; level: string; score: number; max: number }> = {}
  for (const d of data.score?.dimensions || []) {
    const key = (d.name || d.code || '').toLowerCase()
    dims[key] = { pct: d.pct || 0, level: d.level || '', score: d.score || 0, max: d.maxScore || 0 }
  }

  // ---- PAGE 1 -------------------------------------------------------------
  ctx.page.drawText('Learning Style Report', {
    x: ctx.margin, y: ctx.y - 20, size: 20, font: ctx.fontBold, color: C.NAVY,
  })
  ctx.y -= 28
  drawText(ctx, `Student Name: ${sanitize(data.student?.name || '')}`, { size: 11, color: C.SLATE, font: ctx.fontBold })
  drawText(ctx, `Date: ${fmtDate(data.attempt?.completedAt || data.attempt?.startedAt)}`, { size: 11, color: C.SLATE })
  spacer(ctx, 12)

  heading(ctx, 'About Learning Styles', 16, C.NAVY)
  drawText(ctx, 'Every learner has a unique combination of preferences across sensory channels, environmental conditions and mindset factors that shape how they absorb, retain and apply information. This report maps your preferences across 16 dimensions grouped into three categories: Sensory (how you take in information), Environmental (the conditions under which you focus best) and Mindset (the psychological and social factors that drive your engagement). For each dimension you will see whether you scored high or low, what that means, and concrete recommendations you can act on immediately.', { size: 10 })
  spacer(ctx, 8)
  drawText(ctx, 'High scores indicate a strong preference for that channel or condition; low scores indicate a weaker preference or that the opposite condition suits you better. Neither pole is "better" - the goal is self-awareness, so you can deliberately design your study routine around your strengths.', { size: 10 })
  spacer(ctx, 10)

  // Snapshot bar chart of all dimensions
  heading(ctx, 'Your Learning Style Profile', 13, C.TEAL)
  const snapshotRows = CATS.map(c => {
    const d = dims[c.n.toLowerCase()]
    return {
      label: c.n,
      bars: [{
        value: d?.pct || 0, color: lvlColor(d?.level || ''),
        label: d ? `${d.pct}%` : '',
      }],
    }
  })
  if (snapshotRows.length) drawBarChart(ctx, snapshotRows, { labelW: 110, rowH: 16, valueMax: 100 })

  // ---- Grouped category sections ------------------------------------------
  const categoryOrder = ['Sensory', 'Environmental', 'Mindset']
  const categoryIntros: Record<string, string> = {
    Sensory: 'Sensory dimensions describe the channels through which you most naturally absorb information. Most learners have a primary sensory channel and a secondary one; very few learners rely equally on all four.',
    Environmental: 'Environmental dimensions describe the physical conditions under which your concentration and retention are strongest. Small adjustments to your study space can produce outsized gains in focus.',
    Mindset: 'Mindset dimensions describe the psychological and social factors that influence how engaged, motivated and disciplined you are when learning.',
  }

  for (const catType of categoryOrder) {
    const catDims = CATS.filter(c => c.type === catType)
    if (!catDims.length) continue
    addPage(ctx)
    heading(ctx, `${catType} Preferences`, 16, C.NAVY)
    drawText(ctx, categoryIntros[catType] || '', { size: 10 })
    spacer(ctx, 8)

    for (const cat of catDims) {
      const dbRow = LEARNING_STYLE_DB[cat.n]
      const d = dims[cat.n.toLowerCase()]
      const pct = d?.pct || 0
      const isHigh = pct >= 50
      const indicator = isHigh ? 'High Preference' : 'Low Preference'
      const indicatorColor = isHigh ? C.GREEN : C.AMBER
      const recommendation = isHigh ? (dbRow?.high || '') : (dbRow?.low || '')

      // Dimension header band
      ensureSpace(ctx, 36)
      const bandY = ctx.y
      ctx.page.drawRectangle({ x: ctx.margin, y: bandY - 26, width: ctx.contentW, height: 26, color: C.LIGHT })
      ctx.page.drawText(sanitize(cat.n), {
        x: ctx.margin + 8, y: bandY - 18, size: 11, font: ctx.fontBold, color: C.NAVY,
      })
      const indLabel = `${indicator} (${pct}%)`
      const indW = ctx.fontBold.widthOfTextAtSize(sanitize(indLabel), 9)
      ctx.page.drawRectangle({ x: ctx.margin + ctx.contentW - indW - 16, y: bandY - 22, width: indW + 12, height: 18, color: indicatorColor })
      ctx.page.drawText(indLabel, {
        x: ctx.margin + ctx.contentW - indW - 10, y: bandY - 16, size: 9, font: ctx.fontBold, color: C.WHITE,
      })
      ctx.y -= 32

      if (dbRow?.description) {
        drawText(ctx, dbRow.description, { size: 9.5 })
        spacer(ctx, 4)
      }
      if (recommendation) {
        heading(ctx, 'Recommendation', 10, C.TEAL)
        drawText(ctx, recommendation, { size: 9.5 })
      }
      spacer(ctx, 10)
    }
  }

  return await finishDoc(ctx, outPath, `Learning Style Report - ${data.student?.name}`)
}

// ===========================================================================
// 5. IDEAL CAREER REPORT (A3 landscape - 1191x842)
// ===========================================================================

/**
 * Ideal Career report — mirrors the reference "Ideal Career.pdf" (~7 pages):
 *   Page 1: "Ideal Career Test Report" heading + student info + "Here Are
 *           Your Top 3 Ideal Careers".
 *   Pages 2+: one page per top-3 career cluster with description + specific
 *             careers list.
 *
 * Page size: A3 landscape (1191 x 842 points).
 */
export async function generateIdealCareerReport(data: ReportData, outPath: string): Promise<string> {
  const PAGE_W = 1191
  const PAGE_H = 842
  const MARGIN = 60
  const ctx = await newCtx({
    pageW: PAGE_W, pageH: PAGE_H, margin: MARGIN,
    studentName: data.student?.name || 'Student',
    footerTitle: 'Ideal Career Test Report',
  })

  // Build RIASEC score lookup from dimensions (codes R, I, A, S, E, C)
  const riasecScores: Record<string, number> = {}
  for (const d of data.score?.dimensions || []) {
    const c = (d.code || '').toUpperCase()
    if (RIASEC_CLUSTERS[c]) {
      riasecScores[c] = d.pct || d.score || 0
    }
  }
  // Top 3 RIASEC clusters by score; fall back to R/I/A if no scores
  const topClusters = Object.keys(RIASEC_CLUSTERS)
    .map(code => ({ code, score: riasecScores[code] || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  // ---- PAGE 1 -------------------------------------------------------------
  ctx.page.drawText('Ideal Career Test Report', {
    x: ctx.margin, y: ctx.y - 30, size: 28, font: ctx.fontBold, color: C.NAVY,
  })
  ctx.y -= 40

  // Student info row
  const phone = data.student?.phone || '-'
  const dateStr = fmtDate(data.attempt?.completedAt || data.attempt?.startedAt)
  const infoLine = `Student Name: ${sanitize(data.student?.name || '')}    |    Phone: ${sanitize(phone)}    |    Date: ${dateStr}`
  drawText(ctx, infoLine, { size: 11, color: C.SLATE, font: ctx.fontBold })
  spacer(ctx, 12)

  // About the test
  heading(ctx, 'About the Ideal Career Test', 14, C.TEAL)
  drawText(ctx, 'The Ideal Career Test combines the RIASEC (Holland) model of vocational interests with measures of Big Five personality traits and core work motivators. Together, these provide a multi-dimensional picture of the careers most likely to align with your natural aptitudes, values and work style. The clusters below rank your top three RIASEC themes; for each you will see a description of the work environment, the kind of activities that suit you and a list of representative careers to begin your exploration.', { size: 10 })
  spacer(ctx, 10)

  // "Here are your top 3 ideal careers" heading + summary cards
  heading(ctx, 'Here Are Your Top 3 Ideal Careers', 16, C.NAVY)
  spacer(ctx, 6)
  const cardW = (ctx.contentW - 30) / 3
  const cardH = 120
  ensureSpace(ctx, cardH + 20)
  topClusters.forEach((cluster, i) => {
    const info = RIASEC_CLUSTERS[cluster.code]
    if (!info) return
    const cx = ctx.margin + i * (cardW + 15)
    const cy = ctx.y - cardH
    const color = [C.TEAL, C.NAVY, C.PLUM][i] || C.TEAL
    ctx.page.drawRectangle({ x: cx, y: cy, width: cardW, height: cardH, color: color })
    ctx.page.drawText(`#${i + 1}`, {
      x: cx + 14, y: cy + cardH - 30, size: 16, font: ctx.fontBold, color: C.WHITE,
    })
    ctx.page.drawText(sanitize(info.name), {
      x: cx + 14, y: cy + cardH - 55, size: 13, font: ctx.fontBold, color: C.WHITE, maxWidth: cardW - 28,
    })
    ctx.page.drawText(`Score: ${cluster.score}`, {
      x: cx + 14, y: cy + 20, size: 10, font: ctx.font, color: C.WHITE,
    })
  })
  ctx.y -= cardH + 20
  spacer(ctx, 10)

  // RIASEC score table
  heading(ctx, 'Your RIASEC Theme Scores', 13, C.TEAL)
  const allClusters = Object.keys(RIASEC_CLUSTERS).sort((a, b) => (riasecScores[b] || 0) - (riasecScores[a] || 0))
  const tColW = [60, ctx.contentW - 60 - 80 - 120, 80, 120]
  const tHeaders = ['Code', 'Theme', 'Score', 'Level']
  ensureSpace(ctx, 22)
  ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 18, width: ctx.contentW, height: 20, color: C.NAVY })
  let bx = ctx.margin
  tHeaders.forEach((h, i) => {
    ctx.page.drawText(h, { x: bx + 5, y: ctx.y - 13, size: 9.5, font: ctx.fontBold, color: C.WHITE })
    bx += tColW[i]
  })
  ctx.y -= 20
  allClusters.forEach((code, i) => {
    ensureSpace(ctx, 22)
    if (i % 2 === 1) ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 18, width: ctx.contentW, height: 20, color: C.LIGHT })
    const info = RIASEC_CLUSTERS[code]
    const score = riasecScores[code] || 0
    const level = score >= 66 ? 'High' : (score >= 33 ? 'Moderate' : 'Low')
    const cells = [code, sanitize(info.name), String(score), level]
    bx = ctx.margin
    cells.forEach((c, j) => {
      ctx.page.drawText(c, {
        x: bx + 5, y: ctx.y - 13,
        size: 9.5, font: j === 3 ? ctx.fontBold : ctx.font,
        color: j === 3 ? lvlColor(level) : C.SLATE,
      })
      bx += tColW[j]
    })
    ctx.y -= 20
  })

  // ---- Pages 2+: per-cluster detail --------------------------------------
  topClusters.forEach((cluster, idx) => {
    const info = RIASEC_CLUSTERS[cluster.code]
    if (!info) return
    addPage(ctx)

    // Cluster header
    ensureSpace(ctx, 80)
    const color = [C.TEAL, C.NAVY, C.PLUM][idx] || C.TEAL
    ctx.page.drawRectangle({ x: ctx.margin, y: ctx.y - 60, width: ctx.contentW, height: 60, color: color })
    ctx.page.drawText(`Ideal Career #${idx + 1}`, {
      x: ctx.margin + 14, y: ctx.y - 22, size: 11, font: ctx.font, color: C.WHITE,
    })
    ctx.page.drawText(sanitize(info.name), {
      x: ctx.margin + 14, y: ctx.y - 44, size: 20, font: ctx.fontBold, color: C.WHITE,
    })
    const scoreLabel = `RIASEC Score: ${cluster.score}`
    const slW = ctx.fontBold.widthOfTextAtSize(sanitize(scoreLabel), 12)
    ctx.page.drawText(scoreLabel, {
      x: ctx.margin + ctx.contentW - slW - 14, y: ctx.y - 36, size: 12, font: ctx.fontBold, color: C.WHITE,
    })
    ctx.y -= 76

    // Description
    heading(ctx, 'About This Career Cluster', 14, C.NAVY)
    drawText(ctx, info.description, { size: 11 })
    spacer(ctx, 10)

    // Career list — render in two columns to make use of A3 landscape width
    heading(ctx, 'Representative Careers', 14, C.TEAL)
    spacer(ctx, 4)
    const colW = (ctx.contentW - 24) / 2
    const rowH = 26
    info.careers.forEach((career, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = ctx.margin + col * (colW + 24)
      const cy = ctx.y - row * rowH
      ensureSpace(ctx, rowH)
      // Card per career
      ctx.page.drawRectangle({ x: cx, y: cy - 20, width: colW, height: 22, color: i % 2 === 0 ? C.BG_LIGHT : C.LIGHT, borderColor: C.BORDER, borderWidth: 0.25 })
      ctx.page.drawText(`- ${sanitize(career)}`, {
        x: cx + 8, y: cy - 14, size: 10, font: ctx.font, color: C.SLATE, maxWidth: colW - 16,
      })
    })
    const careerRows = Math.ceil(info.careers.length / 2)
    ctx.y -= careerRows * rowH + 10
    spacer(ctx, 10)

    // Personalised note
    heading(ctx, 'What This Means For You', 14, C.NAVY)
    const noteText = `With a RIASEC score of ${cluster.score} on the ${info.code} theme, your responses indicate ${cluster.score >= 66 ? 'a strong' : (cluster.score >= 33 ? 'a moderate' : 'an emerging')} alignment with the ${info.name.split(' - ')[0]} work style. ${cluster.score >= 66 ? 'This is a primary direction worth prioritising in your career exploration.' : (cluster.score >= 33 ? 'Use this as a secondary thread - combine with your top theme for a balanced search.' : 'Treat this as an exploratory avenue - your strongest fit may lie in your top-ranked cluster.')}`
    drawText(ctx, noteText, { size: 11, color: C.SLATE })
    spacer(ctx, 6)
    drawText(ctx, 'Action steps: research 2-3 of the careers above in depth, identify the educational pathway required, speak to professionals already in those roles, and look for internships, shadowing opportunities or short courses that let you test the fit before committing fully.', { size: 10.5, color: C.SLATE })
  })

  return await finishDoc(ctx, outPath, `Ideal Career Report - ${data.student?.name}`)
}

// ---------------------------------------------------------------------------
// Shared finaliser — sets PDF metadata, writes the file, returns outPath.
// ---------------------------------------------------------------------------

async function finishDoc(ctx: PdfCtx, outPath: string, title: string): Promise<string> {
  ctx.doc.setTitle(sanitize(title))
  ctx.doc.setAuthor('Psychometric Testing Platform')
  ctx.doc.setCreator('Psychometric Testing Platform')
  ctx.doc.setProducer('pdf-lib')

  // ensure parent directory exists
  const dir = path.dirname(outPath)
  if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  // pdf-lib's doc.save() returns Promise<Uint8Array>
  const bytes = await ctx.doc.save()
  fs.writeFileSync(outPath, bytes as Uint8Array)
  return outPath
}
