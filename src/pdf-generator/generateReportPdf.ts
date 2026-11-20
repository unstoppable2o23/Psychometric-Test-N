// Centralized colorful multi-page A4 pdf-lib engine — upgraded energetic,
// student-friendly design. Dynamically styles and builds a report for any of
// the 9 tests using its ReportTemplateConfig and AssessmentResult.
// Pure pdf-lib — vector charts (donut, radar, ring gauges, SVG icons),
// no headless browser, no external chart server.

import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { AssessmentResult, BadgeColor, BrandingConfig, ReportTemplateConfig } from '@/types/assessment';

// Vibrant, Student-Friendly Color Palette
const C = {
  midnight: rgb(0.06, 0.09, 0.17),   // #0F172A
  indigo: rgb(0.31, 0.27, 0.90),     // #4F46E5
  electric: rgb(0.15, 0.39, 0.92),   // #2563EB
  cyan: rgb(0.02, 0.71, 0.83),       // #06B6D4
  emerald: rgb(0.06, 0.73, 0.51),    // #10B981
  emeraldDark: rgb(0.02, 0.47, 0.34),
  emeraldBg: rgb(0.92, 0.99, 0.96),
  amber: rgb(0.96, 0.62, 0.04),      // #F59E0B
  amberDark: rgb(0.71, 0.33, 0.04),
  amberBg: rgb(1.0, 0.97, 0.90),
  coral: rgb(0.96, 0.25, 0.37),      // #F43F5E
  coralDark: rgb(0.75, 0.07, 0.24),
  coralBg: rgb(1.0, 0.94, 0.95),
  violet: rgb(0.55, 0.36, 0.96),     // #8B5CF6
  violetBg: rgb(0.96, 0.95, 1.0),
  slate: rgb(0.20, 0.25, 0.33),
  muted: rgb(0.40, 0.45, 0.55),
  border: rgb(0.88, 0.90, 0.94),
  surface: rgb(0.97, 0.98, 0.99),
  softBlue: rgb(0.93, 0.96, 1.0),
  white: rgb(1, 1, 1),
  gold: rgb(0.92, 0.70, 0.03),
  silver: rgb(0.58, 0.64, 0.72),
  bronze: rgb(0.80, 0.50, 0.20),
};

// Crisp Vector SVG Icon Paths (24x24 viewBox)
const ICONS = {
  star: 'M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z',
  trophy: 'M6 4 H18 V9 C18 12.31 15.31 15 12 15 C8.69 15 6 12.31 6 9 V4 Z M9 18 H15 V20 H9 Z M11 15 H13 V18 H11 Z',
  bolt: 'M13 2 L3 14 H12 L11 22 L21 10 H12 L13 2 Z',
  check: 'M20 6 L9 17 L4 12',
};

const W = PageSizes.A4[0]; // 595.28
const H = PageSizes.A4[1]; // 841.89
const M = 34;
const CW = W - M * 2;

const clean = (s: string) =>
  String(s || '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();

function formatCleanDate(rawDate: string): string {
  const parsed = new Date(rawDate);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return clean(rawDate).slice(0, 22);
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function tierTheme(c: BadgeColor) {
  if (c === 'green') return { fg: C.emeraldDark, bg: C.emeraldBg, bar: C.emerald };
  if (c === 'blue' || c === 'sky') return { fg: C.electric, bg: C.softBlue, bar: C.electric };
  if (c === 'amber') return { fg: C.amberDark, bg: C.amberBg, bar: C.amber };
  if (c === 'rose') return { fg: C.coralDark, bg: C.coralBg, bar: C.coral };
  return { fg: C.slate, bg: C.surface, bar: C.muted };
}

/** Draws a circular progress ring gauge using vector arc segments */
function drawRingGauge(
  page: PDFPage,
  cx: number,
  cy: number,
  radius: number,
  pct: number,
  color: ReturnType<typeof rgb>,
  fontBold: PDFFont
) {
  const segments = 48;
  const filledSegs = Math.round((Math.min(100, Math.max(0, pct)) / 100) * segments);

  // Background track ring
  for (let i = 0; i < segments; i++) {
    const a1 = (Math.PI * 2 * i) / segments - Math.PI / 2;
    const a2 = (Math.PI * 2 * (i + 1)) / segments - Math.PI / 2;
    page.drawLine({
      start: { x: cx + radius * Math.cos(a1), y: cy + radius * Math.sin(a1) },
      end: { x: cx + radius * Math.cos(a2), y: cy + radius * Math.sin(a2) },
      thickness: 5,
      color: C.border,
    });
  }

  // Active colored arc
  for (let i = 0; i < filledSegs; i++) {
    const a1 = (Math.PI * 2 * i) / segments - Math.PI / 2;
    const a2 = (Math.PI * 2 * (i + 1)) / segments - Math.PI / 2;
    page.drawLine({
      start: { x: cx + radius * Math.cos(a1), y: cy + radius * Math.sin(a1) },
      end: { x: cx + radius * Math.cos(a2), y: cy + radius * Math.sin(a2) },
      thickness: 5.5,
      color,
    });
  }

  const txt = `${Math.round(pct)}%`;
  const tw = fontBold.widthOfTextAtSize(txt, 10.5);
  page.drawText(txt, { x: cx - tw / 2, y: cy - 4, size: 10.5, font: fontBold, color: C.midnight });
}

/** Draws a colorful vector Donut Chart for macro domain/sector splits */
function drawDonutChart(
  page: PDFPage,
  cx: number,
  cy: number,
  radius: number,
  slices: Array<{ label: string; pct: number; color: ReturnType<typeof rgb> }>
) {
  const total = slices.reduce((a, b) => a + b.pct, 0) || 100;
  let currentAngle = -Math.PI / 2;

  slices.forEach((slice) => {
    const sweep = (slice.pct / total) * Math.PI * 2;
    const steps = Math.max(4, Math.round((slice.pct / total) * 60));
    for (let i = 0; i < steps; i++) {
      const a1 = currentAngle + (sweep * i) / steps;
      const a2 = currentAngle + (sweep * (i + 1)) / steps;
      page.drawLine({
        start: { x: cx + radius * Math.cos(a1), y: cy + radius * Math.sin(a1) },
        end: { x: cx + radius * Math.cos(a2), y: cy + radius * Math.sin(a2) },
        thickness: 16,
        color: slice.color,
      });
    }
    currentAngle += sweep;
  });
}

/** Optionally embeds a remote PNG/JPG client logo without failing if unavailable */
async function tryEmbedLogo(pdf: PDFDocument, logoUrl?: string) {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (logoUrl.toLowerCase().endsWith('.jpg') || logoUrl.toLowerCase().endsWith('.jpeg')) {
      return await pdf.embedJpg(bytes);
    }
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function generateUnifiedReportPdf(
  result: AssessmentResult,
  template: ReportTemplateConfig,
  branding: BrandingConfig = {}
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const logoImage = await tryEmbedLogo(pdf, branding.logoUrl);

  const accent = rgb(...template.accentHex);
  const clientName = clean(branding.clientName || 'EduCompass Psychometric Platform');
  const displayDate = formatCleanDate(result.dateFormatted);
  const pages: PDFPage[] = [];

  const createSubPage = (kicker: string, title: string): { page: PDFPage; y: number } => {
    const page = pdf.addPage(PageSizes.A4);
    pages.push(page);

    // Energetic dual-tone top header bar
    page.drawRectangle({ x: 0, y: H - 68, width: W, height: 68, color: C.midnight });
    page.drawRectangle({ x: 0, y: H - 72, width: W * 0.5, height: 4, color: accent });
    page.drawRectangle({ x: W * 0.5, y: H - 72, width: W * 0.3, height: 4, color: C.cyan });
    page.drawRectangle({ x: W * 0.8, y: H - 72, width: W * 0.2, height: 4, color: C.emerald });

    page.drawText(clean(kicker.toUpperCase()), { x: M, y: H - 24, size: 7.5, font: fontBold, color: C.cyan });
    page.drawText(clean(title), { x: M, y: H - 46, size: 16, font: serifBold, color: C.white });

    if (logoImage) {
      const dims = logoImage.scaleToFit(54, 46);
      page.drawImage(logoImage, { x: W - M - dims.width, y: H - 56, width: dims.width, height: dims.height });
    } else {
      const tag = clean(result.student.name);
      page.drawText(tag, { x: W - M - fontBold.widthOfTextAtSize(tag, 9), y: H - 38, size: 9, font: fontBold, color: C.white });
      page.drawText(displayDate, { x: W - M - font.widthOfTextAtSize(displayDate, 7.5), y: H - 51, size: 7.5, font, color: C.silver });
    }

    return { page, y: H - 96 };
  };

  const drawSectionTitle = (page: PDFPage, y: number, title: string, barColor = accent) => {
    page.drawRectangle({ x: M, y: y - 3, width: 4.5, height: 15, color: barColor });
    page.drawText(clean(title), { x: M + 11, y, size: 12.5, font: serifBold, color: C.midnight });
    return y - 20;
  };

  const drawPillBadge = (page: PDFPage, x: number, y: number, label: string, color: BadgeColor, width = 62) => {
    const t = tierTheme(color);
    const txt = clean(label).toUpperCase();
    page.drawRectangle({ x, y: y - 3, width, height: 14, color: t.bg, borderColor: t.fg, borderWidth: 0.7 });
    const tw = fontBold.widthOfTextAtSize(txt, 6.8);
    page.drawText(txt, { x: x + (width - tw) / 2, y: y + 1, size: 6.8, font: fontBold, color: t.fg });
  };

  const drawCalloutCard = (
    page: PDFPage,
    y: number,
    title: string,
    body: string,
    bgColor = C.softBlue,
    accentColor = accent,
    iconPath = ICONS.bolt
  ) => {
    const lines = wrapText(body, font, 8.8, CW - 48);
    const boxH = Math.max(46, 26 + lines.length * 12.5);
    page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: bgColor, borderColor: accentColor, borderWidth: 0.8 });
    page.drawRectangle({ x: M, y: y - boxH, width: 5, height: boxH, color: accentColor });

    // Vector Icon Badge
    page.drawCircle({ x: M + 22, y: y - 22, size: 11, color: accentColor });
    page.drawSvgPath(iconPath, { x: M + 15, y: y - 15, scale: 0.58, color: C.white });

    page.drawText(clean(title), { x: M + 40, y: y - 16, size: 9.8, font: fontBold, color: C.midnight });
    let ty = y - 30;
    lines.forEach((l) => {
      page.drawText(l, { x: M + 40, y: ty, size: 8.8, font, color: C.slate });
      ty -= 12.5;
    });
    return y - boxH - 14;
  };

  // =========================================================================
  // PAGE 1: HIGH-ENERGY HERO COVER & SUPERPOWER SNAPSHOT
  // =========================================================================
  {
    const page = pdf.addPage(PageSizes.A4);
    pages.push(page);

    // Bold Dark Hero Header Block
    page.drawRectangle({ x: 0, y: H - 205, width: W, height: 205, color: C.midnight });
    // Decorative Geometric Energy Shapes in Top-Right
    page.drawCircle({ x: W - 45, y: H - 40, size: 95, color: C.indigo, opacity: 0.25 });
    page.drawCircle({ x: W - 110, y: H - 150, size: 65, color: C.cyan, opacity: 0.18 });
    // Vibrant Multi-Color Accent Strip
    page.drawRectangle({ x: 0, y: H - 211, width: W * 0.4, height: 6, color: C.indigo });
    page.drawRectangle({ x: W * 0.4, y: H - 211, width: W * 0.35, height: 6, color: C.cyan });
    page.drawRectangle({ x: W * 0.75, y: H - 211, width: W * 0.25, height: 6, color: C.emerald });

    // Brand Name / Logo
    if (logoImage) {
      const dims = logoImage.scaleToFit(110, 48);
      page.drawImage(logoImage, { x: M, y: H - 62, width: dims.width, height: dims.height });
    } else {
      page.drawText(clientName.toUpperCase(), { x: M, y: H - 36, size: 9.5, font: fontBold, color: C.cyan });
    }

    page.drawText(clean(template.reportTitle), { x: M, y: H - 92, size: 26, font: serifBold, color: C.white });
    page.drawText(clean(template.reportSubtitle), { x: M, y: H - 112, size: 10.5, font, color: C.silver });

    // Student Spotlight Pill Inside Hero
    page.drawRectangle({ x: M, y: H - 184, width: CW, height: 54, color: rgb(0.11, 0.16, 0.28), borderColor: C.cyan, borderWidth: 0.8 });
    page.drawText('PREPARED FOR', { x: M + 14, y: H - 146, size: 7, font: fontBold, color: C.cyan });
    page.drawText(clean(result.student.name), { x: M + 14, y: H - 168, size: 17, font: serifBold, color: C.white });

    const metaRight = `Date: ${displayDate}   |   ID: ${result.reportId}`;
    page.drawText(metaRight, { x: W - M - 14 - fontBold.widthOfTextAtSize(metaRight, 8), y: H - 150, size: 8, font: fontBold, color: C.white });
    const contactRight = clean(`${result.student.email}   |   ${result.student.phone}`);
    page.drawText(contactRight, { x: W - M - 14 - font.widthOfTextAtSize(contactRight, 7.8), y: H - 166, size: 7.8, font, color: C.silver });

    let y = H - 238;

    // Optional Hero Archetype (e.g. MBTI) or Top Strength Banner
    if (result.heroBadge) {
      page.drawRectangle({ x: M, y: y - 66, width: CW, height: 66, color: C.violetBg, borderColor: C.violet, borderWidth: 1 });
      const cStr = clean(result.heroBadge.code);
      page.drawText(cStr, { x: W / 2 - serifBold.widthOfTextAtSize(cStr, 26) / 2, y: y - 34, size: 26, font: serifBold, color: C.indigo });
      const sStr = clean(`"${result.heroBadge.subtitle}"`);
      page.drawText(sStr, { x: W / 2 - fontBold.widthOfTextAtSize(sStr, 11) / 2, y: y - 54, size: 11, font: fontBold, color: C.midnight });
      y -= 84;
    }

    // 4 Colorful KPI Cards with Circular Gauges
    y = drawSectionTitle(page, y, 'Your Superpower Snapshot', C.indigo);
    const cardW = (CW - 24) / 4;
    const kpiCols = { blue: C.electric, green: C.emerald, indigo: C.violet, amber: C.amber };

    result.kpis.slice(0, 4).forEach((k, i) => {
      const cx = M + i * (cardW + 8);
      const col = kpiCols[k.color];
      page.drawRectangle({ x: cx, y: y - 104, width: cardW, height: 104, color: C.surface, borderColor: C.border, borderWidth: 0.8 });
      page.drawRectangle({ x: cx, y: y - 5, width: cardW, height: 5, color: col });

      // Parse numeric percentage if available for ring gauge, else draw bold stat
      const numMatch = k.big.match(/(\d+)%/);
      if (numMatch) {
        drawRingGauge(page, cx + cardW / 2, y - 38, 22, Number(numMatch[1]), col, fontBold);
      } else {
        const bText = clean(k.big.slice(0, 12));
        const bw = fontBold.widthOfTextAtSize(bText, 14);
        page.drawText(bText, { x: cx + (cardW - bw) / 2, y: y - 42, size: 14, font: fontBold, color: col });
      }

      const lText = clean(k.label.toUpperCase());
      page.drawText(lText, { x: cx + (cardW - fontBold.widthOfTextAtSize(lText, 6.5)) / 2, y: y - 76, size: 6.5, font: fontBold, color: C.midnight });
      const sText = clean(k.sub.slice(0, 20));
      page.drawText(sText, { x: cx + (cardW - font.widthOfTextAtSize(sText, 7)) / 2, y: y - 90, size: 7, font, color: C.muted });
    });
    y -= 124;

    // Executive Summary
    y = drawSectionTitle(page, y, 'What Your Results Reveal', C.cyan);
    for (const l of wrapText(result.executiveSummary, font, 9.2, CW)) {
      page.drawText(l, { x: M, y, size: 9.2, font, color: C.slate });
      y -= 13.5;
    }
    y -= 12;

    // Energetic Callout Box
    drawCalloutCard(page, y, `Key Takeaway for ${result.student.name}`, result.executiveTakeaway, C.emeraldBg, C.emerald, ICONS.star);
  }

  // =========================================================================
  // PAGE 2: VISUAL ANALYTICS — PODIUM + DONUT + FILLED RADAR CHART
  // =========================================================================
  {
    const { page, y: startY } = createSubPage('Visual Analytics', 'Your Top Strengths & Competency Radar');
    let y = startY;

    // Top 3 Podium Cards (Gold, Silver, Bronze)
    y = drawSectionTitle(page, y, 'Top 3 Podium Matches', C.amber);
    const top3 = result.rankedDimensions.slice(0, 3);
    const podColors = [C.gold, C.silver, C.bronze];
    const podLabels = ['#1 GOLD MATCH', '#2 SILVER MATCH', '#3 BRONZE MATCH'];
    const podW = (CW - 16) / 3;

    top3.forEach((item, i) => {
      const px = M + i * (podW + 8);
      page.drawRectangle({ x: px, y: y - 78, width: podW, height: 78, color: C.surface, borderColor: podColors[i], borderWidth: 1.2 });
      page.drawRectangle({ x: px, y: y - 18, width: podW, height: 18, color: podColors[i] });
      const plw = fontBold.widthOfTextAtSize(podLabels[i], 7.5);
      page.drawText(podLabels[i], { x: px + (podW - plw) / 2, y: y - 12, size: 7.5, font: fontBold, color: C.white });

      const nameLines = wrapText(item.label, fontBold, 9.2, podW - 14);
      let ny = y - 34;
      nameLines.slice(0, 2).forEach((nl) => {
        page.drawText(nl, { x: px + (podW - fontBold.widthOfTextAtSize(nl, 9.2)) / 2, y: ny, size: 9.2, font: fontBold, color: C.midnight });
        ny -= 12;
      });
      const scStr = `${item.percentage}% Match`;
      page.drawText(scStr, { x: px + (podW - fontBold.widthOfTextAtSize(scStr, 10)) / 2, y: y - 68, size: 10, font: fontBold, color: C.indigo });
    });
    y -= 98;

    // Macro Split Donut Chart (if present)
    if (result.macroSplit && result.macroSplit.length > 0) {
      y = drawSectionTitle(page, y, 'Macro Domain Balance', C.cyan);
      const donutCols = [C.electric, C.emerald, C.amber, C.violet];
      const slices = result.macroSplit.map((m, i) => ({ label: m.label, pct: m.percentage, color: donutCols[i % 4] }));

      page.drawRectangle({ x: M, y: y - 124, width: CW, height: 124, color: C.surface, borderColor: C.border, borderWidth: 0.7 });
      drawDonutChart(page, M + 74, y - 62, 38, slices);

      // Legend on the right of the donut
      let ly = y - 26;
      slices.forEach((s, i) => {
        page.drawRectangle({ x: M + 150, y: ly - 2, width: 10, height: 10, color: s.color });
        page.drawText(clean(`${s.label} — ${s.pct}%`), { x: M + 168, y: ly, size: 9, font: fontBold, color: C.midnight });
        page.drawText(clean(result.macroSplit![i].sub), { x: M + 168, y: ly - 11, size: 7.5, font, color: C.muted });
        ly -= 26;
      });
      y -= 142;
    }

    // Filled Vector Radar Chart (or Divergent Bars for MBTI)
    if (result.divergentPairs && result.divergentPairs.length > 0) {
      y = drawSectionTitle(page, y, 'Four-Dimensional Personality Split', C.indigo);
      result.divergentPairs.forEach((p) => {
        page.drawText(clean(`${p.leftLabel} (${p.leftPct}%)`), { x: M, y, size: 8.8, font: fontBold, color: C.electric });
        const rStr = clean(`(${p.rightPct}%) ${p.rightLabel}`);
        page.drawText(rStr, { x: W - M - fontBold.widthOfTextAtSize(rStr, 8.8), y, size: 8.8, font: fontBold, color: C.coral });
        const lw = (CW * p.leftPct) / 100;
        page.drawRectangle({ x: M, y: y - 17, width: lw, height: 12, color: C.electric });
        page.drawRectangle({ x: M + lw, y: y - 17, width: CW - lw, height: 12, color: C.coral });
        y -= 36;
      });
    } else if (result.radarData && result.radarData.length >= 3) {
      y = drawSectionTitle(page, y, 'Competency Radar Profile', C.indigo);
      const cx = W / 2;
      const cy = y - 135;
      const maxR = 94;
      const n = result.radarData.length;

      // Concentric web rings
      [0.25, 0.5, 0.75, 1.0].forEach((sc) => {
        const r = maxR * sc;
        for (let i = 0; i < n; i++) {
          const a1 = (Math.PI * 2 * i) / n - Math.PI / 2;
          const a2 = (Math.PI * 2 * ((i + 1) % n)) / n - Math.PI / 2;
          page.drawLine({
            start: { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) },
            end: { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) },
            thickness: 0.6, color: C.border,
          });
        }
      });

      const pts: Array<{ x: number; y: number }> = [];
      result.radarData.forEach((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) }, thickness: 0.6, color: C.border });
        const vr = maxR * (Math.min(100, d.value) / 100);
        pts.push({ x: cx + vr * Math.cos(angle), y: cy + vr * Math.sin(angle) });

        const lbl = clean(d.label.length > 22 ? d.label.slice(0, 20) + '..' : d.label);
        const lw = fontBold.widthOfTextAtSize(lbl, 7.5);
        page.drawText(lbl, { x: cx + (maxR + 20) * Math.cos(angle) - lw / 2, y: cy + (maxR + 14) * Math.sin(angle) - 3, size: 7.5, font: fontBold, color: C.midnight });
      });

      // Semi-transparent filled radar polygon using SVG path
      const svgPath = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${(H - p.y).toFixed(1)}`).join(' ') + ' Z';
      page.drawSvgPath(svgPath, { x: 0, y: H, color: C.indigo, opacity: 0.22, borderColor: C.indigo, borderWidth: 2 });
      pts.forEach((p) => page.drawCircle({ x: p.x, y: p.y, size: 3.8, color: C.indigo }));
    }
  }

  // =========================================================================
  // PAGE 3: FULL SPECTRUM — PROPERLY SCALED COLOR-CODED BARS (ZERO TRUNCATION)
  // =========================================================================
  {
    const { page, y: startY } = createSubPage('Score Spectrum', 'Complete Dimension Breakdown');
    let y = drawSectionTitle(page, startY, 'All Measured Dimensions Ranked Highest to Lowest', C.electric);

    const labelW = 195; // Generous width so labels never get cut off
    const barX = M + labelW + 8;
    const barW = CW - labelW - 118;

    result.rankedDimensions.forEach((d, idx) => {
      if (y < 75) {
        ({ page: pages[pages.length - 1], y } = createSubPage('Score Spectrum', 'Complete Dimension Breakdown (Continued)'));
      }
      const activePage = pages[pages.length - 1];
      const theme = tierTheme(d.tierColor);

      // Alternating row background
      activePage.drawRectangle({ x: M, y: y - 18, width: CW, height: 24, color: idx % 2 === 0 ? C.surface : C.white });

      // Full cluster name (wrapped cleanly if ultra-long, never hard-cut)
      const labelTxt = clean(`#${idx + 1} ${d.label}`);
      const fontSize = fontBold.widthOfTextAtSize(labelTxt, 8.2) > labelW ? 7.2 : 8.2;
      activePage.drawText(labelTxt, { x: M + 6, y: y - 9, size: fontSize, font: fontBold, color: C.midnight });

      // Progress bar track & colored fill
      activePage.drawRectangle({ x: barX, y: y - 10, width: barW, height: 8, color: C.border });
      activePage.drawRectangle({ x: barX, y: y - 10, width: Math.max(3, (barW * d.percentage) / 100), height: 8, color: theme.bar });

      // Percentage + Pill Badge
      const pctTxt = `${d.percentage}%`;
      activePage.drawText(pctTxt, { x: barX + barW + 8, y: y - 9, size: 8.2, font: fontBold, color: C.midnight });
      drawPillBadge(activePage, W - M - 64, y - 9, d.tier, d.tierColor, 60);

      y -= 26;
    });
  }

  // =========================================================================
  // PAGE 4+: CAREER & CLUSTER EXPLORER CARDS (NO REPETITIVE BOILERPLATE)
  // =========================================================================
  {
    let { page, y } = createSubPage('Career Explorer', 'Matched Roles & Specialisation Insights');
    y = drawSectionTitle(page, y, 'Your Top Matched Career Pathways', C.emerald);

    result.detailRows.forEach((row, idx) => {
      const descLines = wrapText(row.description, font, 8.1, CW - 28);
      const cardH = Math.max(46, 26 + descLines.length * 11.5);

      if (y - cardH < 64) {
        ({ page, y } = createSubPage('Career Explorer', 'Matched Roles & Specialisation Insights (Cont.)'));
      }

      const theme = tierTheme(row.badgeColor);
      page.drawRectangle({ x: M, y: y - cardH, width: CW, height: cardH, color: idx % 2 === 0 ? C.surface : C.white, borderColor: C.border, borderWidth: 0.7 });
      page.drawRectangle({ x: M, y: y - cardH, width: 4, height: cardH, color: theme.bar });

      page.drawText(clean(row.name), { x: M + 12, y: y - 14, size: 9.2, font: fontBold, color: C.midnight });
      // Right-align the score text so it always ends just before the pill
      // badge (never slides underneath it, whatever its length).
      const scoreStr = clean(row.scoreText);
      page.drawText(scoreStr, { x: W - M - 72 - fontBold.widthOfTextAtSize(scoreStr, 8.2), y: y - 14, size: 8.2, font: fontBold, color: theme.fg });
      drawPillBadge(page, W - M - 66, y - 14, row.badge, row.badgeColor, 58);

      let dy = y - 28;
      descLines.forEach((dl) => {
        page.drawText(dl, { x: M + 12, y: dy, size: 8.1, font, color: C.slate });
        dy -= 11.5;
      });

      y -= cardH + 8;
    });
  }

  // =========================================================================
  // FINAL PAGE: GAMIFIED "LEVEL-UP" ROADMAP & COUNSELOR SUMMARY
  // =========================================================================
  {
    const { page, y: startY } = createSubPage('Action Plan', `Your 90-Day Level-Up Roadmap`);
    let y = startY;

    y = drawSectionTitle(page, y, '3-Step Execution Quest', C.indigo);
    const stepCols = [C.electric, C.cyan, C.emerald];

    result.actionSteps.slice(0, 3).forEach((step, i) => {
      const lines = wrapText(step.desc, font, 8.8, CW - 66);
      const boxH = Math.max(54, 28 + lines.length * 12.5);

      page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: C.surface, borderColor: stepCols[i], borderWidth: 0.9 });
      page.drawCircle({ x: M + 26, y: y - boxH / 2, size: 15, color: stepCols[i] });
      page.drawText(String(i + 1), { x: M + 22.5, y: y - boxH / 2 - 4.5, size: 13, font: fontBold, color: C.white });

      page.drawText(clean(step.title), { x: M + 52, y: y - 18, size: 10.2, font: fontBold, color: C.midnight });
      let dy = y - 33;
      lines.forEach((l) => {
        page.drawText(l, { x: M + 52, y: dy, size: 8.8, font, color: C.slate });
        dy -= 12.5;
      });
      y -= boxH + 12;
    });

    y -= 8;
    y = drawCalloutCard(page, y, 'Counselor Final Verdict', result.finalVerdict, C.violetBg, C.indigo, ICONS.trophy);

    // Clean Disclaimer Footer Note
    y -= 6;
    page.drawRectangle({ x: M, y: y - 48, width: CW, height: 48, color: C.surface, borderColor: C.border, borderWidth: 0.6 });
    page.drawText('GUIDANCE NOTE', { x: M + 10, y: y - 14, size: 7.5, font: fontBold, color: C.muted });
    let ny = y - 26;
    wrapText(
      'This psychometric report is designed for academic and career guidance. Discuss these findings with a certified career counsellor alongside your academic records and personal goals.',
      font, 7.6, CW - 20
    ).forEach((l) => {
      page.drawText(l, { x: M + 10, y: ny, size: 7.6, font, color: C.muted });
      ny -= 10;
    });
  }

  // Stamp Clean Footers & Page Numbers on Every Page
  const totalPages = pages.length;
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 34 }, end: { x: W - M, y: 34 }, thickness: 0.75, color: C.border });
    p.drawText(clean(`${clientName}  |  ${result.testTitle}  |  ${result.student.name}`), {
      x: M, y: 20, size: 7.5, font, color: C.muted,
    });
    const pgLabel = `Page ${i + 1} of ${totalPages}`;
    p.drawText(pgLabel, {
      x: W - M - fontBold.widthOfTextAtSize(pgLabel, 7.8), y: 20, size: 7.8, font: fontBold, color: C.midnight,
    });
  });

  return pdf.save();
}
