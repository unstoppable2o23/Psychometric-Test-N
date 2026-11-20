// Centralized colorful multi-page A4 pdf-lib engine. Dynamically styles and
// builds a report for any of the 9 tests using its ReportTemplateConfig and
// AssessmentResult. Pure pdf-lib — vector charts, no headless browser.

import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { AssessmentResult, BadgeColor, BrandingConfig, ReportTemplateConfig } from '@/types/assessment';

const PALETTE = {
  navy: rgb(0.06, 0.09, 0.16),
  blue: rgb(0.15, 0.39, 0.92),
  sky: rgb(0.05, 0.65, 0.91),
  indigo: rgb(0.39, 0.4, 0.95),
  green: rgb(0.06, 0.73, 0.51),
  greenDark: rgb(0.02, 0.47, 0.34),
  greenBg: rgb(0.93, 0.99, 0.96),
  amber: rgb(0.96, 0.62, 0.04),
  amberDark: rgb(0.71, 0.33, 0.04),
  amberBg: rgb(1.0, 0.98, 0.92),
  rose: rgb(0.88, 0.11, 0.28),
  roseDark: rgb(0.75, 0.07, 0.24),
  roseBg: rgb(1.0, 0.95, 0.96),
  slate: rgb(0.2, 0.25, 0.33),
  muted: rgb(0.39, 0.45, 0.55),
  border: rgb(0.89, 0.85, 0.77),
  cream: rgb(0.98, 0.97, 0.95),
  softBlue: rgb(0.94, 0.96, 1.0),
  white: rgb(1, 1, 1),
};

const W = PageSizes.A4[0];
const H = PageSizes.A4[1];
const M = 36;
const CW = W - M * 2;

const clean = (s: string) =>
  s.replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E]/g, ' ');

function wrap(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) line = test;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

function badgePalette(c: BadgeColor) {
  if (c === 'green') return { fg: PALETTE.greenDark, bg: PALETTE.greenBg, bar: PALETTE.green };
  if (c === 'blue' || c === 'sky') return { fg: PALETTE.blue, bg: PALETTE.softBlue, bar: PALETTE.blue };
  if (c === 'amber') return { fg: PALETTE.amberDark, bg: PALETTE.amberBg, bar: PALETTE.amber };
  if (c === 'rose') return { fg: PALETTE.roseDark, bg: PALETTE.roseBg, bar: PALETTE.rose };
  return { fg: PALETTE.slate, bg: PALETTE.cream, bar: PALETTE.muted };
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

  const accent = rgb(...template.accentHex);
  const clientName = clean(branding.clientName || template.reportTitle);
  const pages: PDFPage[] = [];

  const addPage = (sectionTitle?: string): { page: PDFPage; y: number } => {
    const page = pdf.addPage(PageSizes.A4);
    pages.push(page);
    page.drawRectangle({ x: 0, y: H - 8, width: W * 0.65, height: 8, color: accent });
    page.drawRectangle({ x: W * 0.65, y: H - 8, width: W * 0.35, height: 8, color: PALETTE.green });

    if (!sectionTitle) return { page, y: H - 30 };

    page.drawText(clean(`${clientName.toUpperCase()}  |  ${template.reportTitle.toUpperCase()}`), {
      x: M, y: H - 28, size: 7.8, font: fontBold, color: accent,
    });
    page.drawText(clean(sectionTitle), { x: M, y: H - 48, size: 15.5, font: serifBold, color: PALETTE.navy });
    page.drawText(clean(`Candidate: ${result.student.name}  |  Phone: ${result.student.phone}  |  Date: ${result.dateFormatted}`), {
      x: M, y: H - 62, size: 8, font, color: PALETTE.muted,
    });
    page.drawLine({ start: { x: M, y: H - 70 }, end: { x: W - M, y: H - 70 }, thickness: 1.5, color: accent });
    return { page, y: H - 90 };
  };

  const drawHeading = (page: PDFPage, y: number, title: string) => {
    page.drawRectangle({ x: M, y: y - 3, width: 4, height: 14, color: accent });
    page.drawText(clean(title), { x: M + 10, y, size: 12, font: serifBold, color: PALETTE.navy });
    return y - 18;
  };

  const drawPara = (page: PDFPage, y: number, text: string, size = 9) => {
    for (const l of wrap(text, font, size, CW)) {
      page.drawText(l, { x: M, y, size, font, color: PALETTE.slate });
      y -= size * 1.45;
    }
    return y - 4;
  };

  const drawInsight = (page: PDFPage, y: number, title: string, body: string) => {
    const lines = wrap(body, font, 8.6, CW - 24);
    const boxH = 26 + lines.length * 12;
    page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: PALETTE.softBlue, borderColor: accent, borderWidth: 0.6 });
    page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: accent });
    page.drawText(clean(title), { x: M + 12, y: y - 14, size: 9.5, font: fontBold, color: accent });
    let ty = y - 27;
    lines.forEach((l) => { page.drawText(l, { x: M + 12, y: ty, size: 8.6, font, color: PALETTE.slate }); ty -= 12; });
    return y - boxH - 12;
  };

  // ==================== PAGE 1: COVER & EXECUTIVE SUMMARY ====================
  {
    const { page, y: startY } = addPage();
    let y = startY;

    page.drawText(clientName, { x: M, y: y - 10, size: 20, font: serifBold, color: PALETTE.navy });
    page.drawText(clean(template.reportSubtitle.toUpperCase()), { x: M, y: y - 24, size: 8.5, font: fontBold, color: accent });
    page.drawText(`REPORT ID: ${result.reportId}`, {
      x: W - M - fontBold.widthOfTextAtSize(`REPORT ID: ${result.reportId}`, 8), y: y - 12, size: 8, font: fontBold, color: PALETTE.muted,
    });
    page.drawLine({ start: { x: M, y: y - 34 }, end: { x: W - M, y: y - 34 }, thickness: 2, color: accent });
    y -= 50;

    // Candidate Card
    page.drawRectangle({ x: M, y: y - 58, width: CW, height: 58, color: PALETTE.softBlue, borderColor: accent, borderWidth: 0.7 });
    page.drawRectangle({ x: M, y: y - 58, width: 5, height: 58, color: accent });
    page.drawText(clean(result.student.name), { x: M + 14, y: y - 22, size: 17, font: serifBold, color: PALETTE.navy });
    page.drawText(
      clean(`Date: ${result.dateFormatted}  |  Phone: ${result.student.phone}  |  Email: ${result.student.email}  |  Completed: ${result.answeredCount}/${result.totalQuestions}`),
      { x: M + 14, y: y - 42, size: 8, font, color: PALETTE.slate }
    );
    y -= 76;

    // Optional Hero Badge (e.g., MBTI INTJ)
    if (result.heroBadge) {
      page.drawRectangle({ x: M, y: y - 62, width: CW, height: 62, color: PALETTE.cream, borderColor: accent, borderWidth: 1 });
      const cw = serifBold.widthOfTextAtSize(result.heroBadge.code, 26);
      page.drawText(result.heroBadge.code, { x: W / 2 - cw / 2, y: y - 32, size: 26, font: serifBold, color: accent });
      const sw = fontBold.widthOfTextAtSize(clean(result.heroBadge.subtitle), 11);
      page.drawText(clean(result.heroBadge.subtitle), { x: W / 2 - sw / 2, y: y - 50, size: 11, font: fontBold, color: PALETTE.navy });
      y -= 78;
    }

    y = drawHeading(page, y, 'Executive Assessment Summary');
    y = drawPara(page, y, result.executiveSummary);
    y -= 6;

    // 4 Colorful KPI Cards
    const cardW = (CW - 24) / 4;
    const kpiColors = { blue: PALETTE.blue, green: PALETTE.green, indigo: PALETTE.indigo, amber: PALETTE.amber };
    result.kpis.forEach((k, i) => {
      const cx = M + i * (cardW + 8);
      const col = kpiColors[k.color];
      page.drawRectangle({ x: cx, y: y - 62, width: cardW, height: 62, color: PALETTE.cream, borderColor: PALETTE.border, borderWidth: 0.7 });
      page.drawRectangle({ x: cx, y: y - 4, width: cardW, height: 4, color: col });
      const bStr = clean(k.big.slice(0, 12));
      const bw = fontBold.widthOfTextAtSize(bStr, 13.5);
      page.drawText(bStr, { x: cx + (cardW - bw) / 2, y: y - 25, size: 13.5, font: fontBold, color: col });
      const lw = fontBold.widthOfTextAtSize(clean(k.label.toUpperCase()), 6.3);
      page.drawText(clean(k.label.toUpperCase()), { x: cx + (cardW - lw) / 2, y: y - 40, size: 6.3, font: fontBold, color: PALETTE.muted });
      const sStr = clean(k.sub.slice(0, 18));
      const sw = font.widthOfTextAtSize(sStr, 7);
      page.drawText(sStr, { x: cx + (cardW - sw) / 2, y: y - 53, size: 7, font, color: PALETTE.slate });
    });
    y -= 80;

    drawInsight(page, y, `Executive Takeaway for ${result.student.name}`, result.executiveTakeaway);
  }

  // ==================== PAGE 2: METHODOLOGY & VISUAL PROFILE ====================
  {
    const { page, y: startY } = addPage('Methodology & Core Visual Profile');
    let y = startY;

    y = drawHeading(page, y, 'Assessment Methodology');
    const sw = (CW - 16) / Math.min(3, template.methodologySteps.length);
    template.methodologySteps.slice(0, 3).forEach((s, i) => {
      const sx = M + i * (sw + 8);
      page.drawRectangle({ x: sx, y: y - 82, width: sw, height: 82, color: PALETTE.cream, borderColor: PALETTE.border, borderWidth: 0.7 });
      page.drawRectangle({ x: sx, y: y - 4, width: sw, height: 4, color: accent });
      page.drawText(clean(`${i + 1}. ${s.title}`), { x: sx + 8, y: y - 20, size: 8.8, font: fontBold, color: PALETTE.navy });
      let dy = y - 34;
      wrap(s.desc, font, 7.6, sw - 16).forEach((l) => {
        page.drawText(l, { x: sx + 8, y: dy, size: 7.6, font, color: PALETTE.muted });
        dy -= 10.5;
      });
    });
    y -= 102;

    // Render Divergent Bars (MBTI) OR Vector Radar Chart (all other tests)
    if (result.divergentPairs && result.divergentPairs.length > 0) {
      y = drawHeading(page, y, 'Four-Dimensional Cognitive Split');
      result.divergentPairs.forEach((p) => {
        page.drawText(clean(`${p.leftLabel} - ${p.leftPct}%`), { x: M, y, size: 8.5, font: fontBold, color: PALETTE.blue });
        const rStr = clean(`${p.rightPct}% - ${p.rightLabel}`);
        page.drawText(rStr, { x: W - M - fontBold.widthOfTextAtSize(rStr, 8.5), y, size: 8.5, font: fontBold, color: PALETTE.rose });
        const lw = (CW * p.leftPct) / 100;
        page.drawRectangle({ x: M, y: y - 16, width: lw, height: 11, color: PALETTE.blue });
        page.drawRectangle({ x: M + lw, y: y - 16, width: CW - lw, height: 11, color: PALETTE.rose });
        y -= 34;
      });
    } else if (result.radarData && result.radarData.length >= 3) {
      y = drawHeading(page, y, 'Multidimensional Competency Radar');
      const cx = W / 2;
      const cy = y - 130;
      const maxR = 92;
      const n = result.radarData.length;

      [0.25, 0.5, 0.75, 1.0].forEach((sc) => {
        const r = maxR * sc;
        for (let i = 0; i < n; i++) {
          const a1 = (Math.PI * 2 * i) / n - Math.PI / 2;
          const a2 = (Math.PI * 2 * ((i + 1) % n)) / n - Math.PI / 2;
          page.drawLine({
            start: { x: cx + r * Math.cos(a1), y: cy + r * Math.sin(a1) },
            end: { x: cx + r * Math.cos(a2), y: cy + r * Math.sin(a2) },
            thickness: 0.6, color: PALETTE.border,
          });
        }
      });

      const pts: Array<{ x: number; y: number }> = [];
      result.radarData.forEach((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) }, thickness: 0.6, color: PALETTE.border });
        const vr = maxR * (Math.min(100, d.value) / 100);
        pts.push({ x: cx + vr * Math.cos(angle), y: cy + vr * Math.sin(angle) });
        const lbl = clean(d.label.length > 18 ? d.label.slice(0, 16) + '..' : d.label);
        const lw = fontBold.widthOfTextAtSize(lbl, 7.5);
        page.drawText(lbl, { x: cx + (maxR + 18) * Math.cos(angle) - lw / 2, y: cy + (maxR + 14) * Math.sin(angle) - 3, size: 7.5, font: fontBold, color: PALETTE.navy });
      });

      for (let i = 0; i < pts.length; i++) {
        page.drawLine({ start: pts[i], end: pts[(i + 1) % pts.length], thickness: 2.2, color: accent });
      }
      pts.forEach((p) => page.drawCircle({ x: p.x, y: p.y, size: 3.5, color: accent }));
    }
  }

  // ==================== PAGE 3: COMPLETE RANKED SPECTRUM ====================
  {
    const { page, y: startY } = addPage('Dimension & Category Score Spectrum');
    let y = drawHeading(page, startY, 'Color-Coded Ranking Spectrum');

    result.rankedDimensions.slice(0, 19).forEach((d) => {
      const col = badgePalette(d.tierColor);
      page.drawText(clean(d.label), { x: M + 4, y, size: 8.2, font: fontBold, color: PALETTE.navy });
      const sTxt = `${d.percentage}%  [${d.tier.toUpperCase()}]`;
      page.drawText(clean(sTxt), { x: W - M - fontBold.widthOfTextAtSize(clean(sTxt), 7.8), y, size: 7.8, font: fontBold, color: col.fg });
      page.drawRectangle({ x: M + 4, y: y - 10, width: CW - 8, height: 6.5, color: PALETTE.border });
      page.drawRectangle({ x: M + 4, y: y - 10, width: Math.max(2, ((CW - 8) * d.percentage) / 100), height: 6.5, color: col.bar });
      y -= 24;
    });
  }

  // ==================== PAGE 4+: DETAILED TABLES & ACTION PLAN ====================
  {
    let { page, y } = addPage('Detailed Career Mappings & Action Plan');
    y = drawHeading(page, y, 'Detailed Breakdown');

    for (let i = 0; i < result.detailRows.length; i++) {
      const r = result.detailRows[i];
      const descLines = wrap(r.description, font, 7.6, CW - 165);
      const rowH = Math.max(30, descLines.length * 10 + 12);

      if (y - rowH < 65) {
        ({ page, y } = addPage('Detailed Career Mappings (Continued)'));
      }

      const col = badgePalette(r.badgeColor);
      page.drawRectangle({ x: M, y: y - rowH, width: CW, height: rowH, color: i % 2 === 1 ? PALETTE.cream : PALETTE.white, borderColor: PALETTE.border, borderWidth: 0.5 });
      page.drawText(clean(r.name.slice(0, 26)), { x: M + 6, y: y - 12, size: 8, font: fontBold, color: PALETTE.navy });
      page.drawText(clean(`${r.scoreText} | ${r.badge}`), { x: M + 6, y: y - 23, size: 7, font: fontBold, color: col.fg });

      let dy = y - 11;
      descLines.forEach((dl) => {
        page.drawText(dl, { x: M + 158, y: dy, size: 7.6, font, color: PALETTE.slate });
        dy -= 10;
      });
      y -= rowH;
    }

    if (y < 210) ({ page, y } = addPage('Actions & Next Steps'));
    else y -= 16;

    y = drawHeading(page, y, `Actions & Next Steps for ${result.student.name}`);
    const aw = (CW - 16) / 3;
    result.actionSteps.slice(0, 3).forEach((a, i) => {
      const ax = M + i * (aw + 8);
      page.drawRectangle({ x: ax, y: y - 80, width: aw, height: 80, color: PALETTE.cream, borderColor: PALETTE.border, borderWidth: 0.7 });
      page.drawRectangle({ x: ax, y: y - 4, width: aw, height: 4, color: PALETTE.green });
      page.drawText(clean(`${i + 1}. ${a.title}`), { x: ax + 8, y: y - 18, size: 8.3, font: fontBold, color: PALETTE.navy });
      let dy = y - 32;
      wrap(a.desc, font, 7.5, aw - 16).forEach((l) => {
        page.drawText(l, { x: ax + 8, y: dy, size: 7.5, font, color: PALETTE.slate });
        dy -= 10;
      });
    });
    y -= 92;

    drawInsight(page, y, 'Final Counselor Summary', result.finalVerdict);
  }

  // Stamp consistent footers & page numbering across all generated pages
  const total = pages.length;
  pages.forEach((p, idx) => {
    p.drawLine({ start: { x: M, y: 36 }, end: { x: W - M, y: 36 }, thickness: 0.75, color: PALETTE.border });
    p.drawText(clean(`${clientName} - Candidate: ${result.student.name}`), { x: M, y: 22, size: 7.8, font, color: PALETTE.muted });
    const pgStr = `Page ${idx + 1} of ${total}`;
    p.drawText(pgStr, { x: W - M - fontBold.widthOfTextAtSize(pgStr, 7.8), y: 22, size: 7.8, font: fontBold, color: PALETTE.navy });
  });

  return pdf.save();
}
