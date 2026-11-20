// Commerce Career Selector — backend pdf-lib 10-page A4 PDF generator.
// Generates a crisp, vector-drawn, 10-page A4 PDF entirely in TypeScript using
// pdf-lib — complete with vector bar charts, an 8-axis vector radar chart,
// color-coded badges, KPI cards, and zero text clipping.

import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, PageSizes } from 'pdf-lib';
import { LEVEL_DESCRIPTORS } from './data';
import { BrandingConfig, ClusterResult, CommerceReportResult, InterestLevel } from './types';

// Palette (Modern Colorful Theme)
const C = {
  navy: rgb(0.06, 0.09, 0.16),      // #0F172A
  blue: rgb(0.15, 0.39, 0.92),      // #2563EB
  sky: rgb(0.05, 0.65, 0.91),       // #0EA5E9
  indigo: rgb(0.39, 0.4, 0.95),     // #6366F1
  green: rgb(0.06, 0.73, 0.51),     // #10B981
  greenDark: rgb(0.02, 0.47, 0.34), // #047857
  greenBg: rgb(0.93, 0.99, 0.96),
  amber: rgb(0.96, 0.62, 0.04),     // #F59E0B
  amberDark: rgb(0.71, 0.33, 0.04), // #B45309
  amberBg: rgb(1.0, 0.98, 0.92),
  rose: rgb(0.88, 0.11, 0.28),      // #E11D48
  roseDark: rgb(0.75, 0.07, 0.24),  // #BE123C
  roseBg: rgb(1.0, 0.95, 0.96),
  slate: rgb(0.2, 0.25, 0.33),      // #334155
  muted: rgb(0.39, 0.45, 0.55),     // #64748B
  border: rgb(0.89, 0.85, 0.77),    // #E2D9C5
  cream: rgb(0.98, 0.97, 0.95),     // #FAF8F2
  softBlue: rgb(0.94, 0.96, 1.0),   // #EFF6FF
  white: rgb(1, 1, 1),
};

const W = PageSizes.A4[0]; // 595.28
const H = PageSizes.A4[1]; // 841.89
const M = 36;              // Margin
const CW = W - M * 2;      // Content width (523.28)

// Sanitize strings for WinAnsi standard fonts
function clean(str: string): string {
  return str
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = clean(text).split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function levelColors(level: InterestLevel) {
  if (level === 'High') return { fg: C.greenDark, bg: C.greenBg, bar: C.green };
  if (level === 'Medium') return { fg: C.amberDark, bg: C.amberBg, bar: C.amber };
  return { fg: C.roseDark, bg: C.roseBg, bar: C.rose };
}

export async function generateCommercePdf(
  report: CommerceReportResult,
  branding: BrandingConfig = {}
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const clientTitle = clean(branding.clientName || 'Commerce Career Selector');
  const totalPages = 10;

  // Helper: Draw Sub-page Header & Footer
  const initPage = (pageNum: number, sectionTitle?: string): { page: PDFPage; y: number } => {
    const page = pdf.addPage(PageSizes.A4);

    // Top colorful accent strip
    page.drawRectangle({ x: 0, y: H - 8, width: W * 0.6, height: 8, color: C.blue });
    page.drawRectangle({ x: W * 0.6, y: H - 8, width: W * 0.4, height: 8, color: C.green });

    // Footer
    page.drawLine({ start: { x: M, y: 38 }, end: { x: W - M, y: 38 }, thickness: 0.75, color: C.border });
    page.drawText(clean(`${clientTitle} - Candidate: ${report.student.name}`), {
      x: M, y: 24, size: 8, font, color: C.muted,
    });
    const pgLabel = `Page ${pageNum} of ${totalPages}`;
    page.drawText(pgLabel, {
      x: W - M - fontBold.widthOfTextAtSize(pgLabel, 8), y: 24, size: 8, font: fontBold, color: C.navy,
    });

    if (!sectionTitle) {
      return { page, y: H - 32 };
    }

    page.drawText(clean(`${clientTitle.toUpperCase()}  |  COMMERCE CAREER SELECTOR`), {
      x: M, y: H - 30, size: 8, font: fontBold, color: C.blue,
    });
    page.drawText(clean(sectionTitle), {
      x: M, y: H - 50, size: 16, font: serifBold, color: C.navy,
    });
    page.drawText(clean(`Candidate: ${report.student.name}   |   Phone: ${report.student.phone}   |   Date: ${report.dateFormatted}`), {
      x: M, y: H - 64, size: 8, font, color: C.muted,
    });
    page.drawLine({ start: { x: M, y: H - 72 }, end: { x: W - M, y: H - 72 }, thickness: 1.5, color: C.blue });

    return { page, y: H - 92 };
  };

  // Helper: Draw Section Heading with Left Accent Bar
  const drawHeading = (page: PDFPage, y: number, title: string): number => {
    page.drawRectangle({ x: M, y: y - 3, width: 4, height: 14, color: C.blue });
    page.drawText(clean(title), { x: M + 10, y, size: 12, font: serifBold, color: C.navy });
    return y - 18;
  };

  // Helper: Draw Paragraph
  const drawPara = (page: PDFPage, y: number, text: string, size = 9.2, maxWidth = CW, x = M): number => {
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      page.drawText(line, { x, y, size, font, color: C.slate });
      y -= size * 1.45;
    }
    return y - 4;
  };

  // Helper: Draw Badge
  const drawBadge = (page: PDFPage, x: number, y: number, level: InterestLevel) => {
    const col = levelColors(level);
    const label = level.toUpperCase();
    const bw = 48;
    page.drawRectangle({ x, y: y - 3, width: bw, height: 13, color: col.bg, borderColor: col.fg, borderWidth: 0.7 });
    const tw = fontBold.widthOfTextAtSize(label, 7);
    page.drawText(label, { x: x + (bw - tw) / 2, y: y + 1, size: 7, font: fontBold, color: col.fg });
  };

  // Helper: Draw Insight Callout Box
  const drawInsight = (page: PDFPage, y: number, title: string, body: string): number => {
    const lines = wrapText(body, font, 8.6, CW - 24);
    const boxH = 26 + lines.length * 12.5;
    page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: C.softBlue, borderColor: C.blue, borderWidth: 0.6 });
    page.drawRectangle({ x: M, y: y - boxH, width: 4, height: boxH, color: C.blue });
    page.drawText(clean(title), { x: M + 12, y: y - 14, size: 9.5, font: fontBold, color: C.blue });
    let ty = y - 28;
    for (const l of lines) {
      page.drawText(l, { x: M + 12, y: ty, size: 8.6, font, color: C.slate });
      ty -= 12.5;
    }
    return y - boxH - 12;
  };

  // Helper: Draw Horizontal Bar Chart
  const drawHorizBars = (
    page: PDFPage,
    y: number,
    items: Array<{ label: string; pct: number; sub?: string; level?: InterestLevel; color?: ReturnType<typeof rgb> }>,
    barHeight = 9,
    rowGap = 24
  ): number => {
    const colors = [C.blue, C.sky, C.green, C.indigo, C.amber];
    items.forEach((item, idx) => {
      const col = item.color || (item.level ? levelColors(item.level).bar : colors[idx % colors.length]);
      page.drawText(clean(item.label), { x: M + 8, y, size: 8.5, font: fontBold, color: C.navy });
      const pctStr = item.sub ? `${item.pct}% (${item.sub})` : `${item.pct}%`;
      const rightOffset = item.level ? 62 : 8;
      page.drawText(clean(pctStr), {
        x: W - M - rightOffset - fontBold.widthOfTextAtSize(pctStr, 8.2),
        y, size: 8.2, font: fontBold, color: C.slate,
      });
      if (item.level) drawBadge(page, W - M - 56, y, item.level);

      const trackY = y - barHeight - 3;
      const trackW = CW - 16;
      page.drawRectangle({ x: M + 8, y: trackY, width: trackW, height: barHeight, color: C.border });
      page.drawRectangle({ x: M + 8, y: trackY, width: Math.max(2, (trackW * item.pct) / 100), height: barHeight, color: col });
      y -= rowGap;
    });
    return y;
  };

  // Helper: Draw Cluster Table (Pages 7-10)
  const drawClusterTable = (page: PDFPage, startY: number, clusters: ClusterResult[]): number => {
    let y = startY;
    const colW = [132, 92, 58, CW - 282];
    const headers = ['CAREER CLUSTER', 'AFFINITY SCORE', 'LEVEL', 'CAREER OPTIONS'];

    // Header Row
    page.drawRectangle({ x: M, y: y - 20, width: CW, height: 20, color: C.navy });
    let cx = M;
    headers.forEach((h, i) => {
      page.drawText(h, { x: cx + 6, y: y - 13, size: 7.5, font: fontBold, color: C.white });
      cx += colW[i];
    });
    y -= 20;

    clusters.forEach((c, idx) => {
      const roleLines = wrapText(c.roles.join(', '), font, 7.8, colW[3] - 10);
      const nameLines = wrapText(c.cluster, fontBold, 8.2, colW[0] - 10);
      const rowH = Math.max(38, Math.max(roleLines.length * 10.5 + 10, nameLines.length * 11 + 16));

      page.drawRectangle({
        x: M, y: y - rowH, width: CW, height: rowH,
        color: idx % 2 === 1 ? C.cream : C.white,
        borderColor: C.border, borderWidth: 0.5,
      });

      // Col 1: Name + Rank
      let ny = y - 12;
      nameLines.forEach((nl) => {
        page.drawText(nl, { x: M + 5, y: ny, size: 8.2, font: fontBold, color: C.navy });
        ny -= 10.5;
      });
      page.drawText(`Rank #${c.rank} | ${c.domain}`, { x: M + 5, y: ny, size: 6.8, font, color: C.muted });

      // Col 2: Mini Bar + %
      const bx = M + colW[0] + 6;
      const by = y - rowH / 2 + 2;
      page.drawRectangle({ x: bx, y: by - 6, width: 46, height: 6, color: C.border });
      page.drawRectangle({ x: bx, y: by - 6, width: (46 * c.percentage) / 100, height: 6, color: levelColors(c.level).bar });
      page.drawText(`${c.percentage}%`, { x: bx + 51, y: by - 6, size: 7.8, font: fontBold, color: C.navy });

      // Col 3: Level Badge
      drawBadge(page, M + colW[0] + colW[1] + 5, y - rowH / 2 - 2, c.level);

      // Col 4: Roles
      let ry = y - 11;
      roleLines.forEach((rl) => {
        page.drawText(rl, { x: M + colW[0] + colW[1] + colW[2] + 5, y: ry, size: 7.8, font, color: C.slate });
        ry -= 10.5;
      });

      y -= rowH;
    });

    return y - 12;
  };

  // ==================== PAGE 1: COVER & EXECUTIVE SUMMARY ====================
  {
    const { page, y: startY } = initPage(1);
    let y = startY;

    // Cover Brand Header
    page.drawText(clientTitle, { x: M, y: y - 10, size: 20, font: serifBold, color: C.navy });
    page.drawText('PSYCHOMETRIC CAREER ASSESSMENT & COUNSELING REPORT', { x: M, y: y - 24, size: 8.5, font: fontBold, color: C.blue });
    page.drawText(`REPORT ID: ${report.reportId}`, {
      x: W - M - fontBold.widthOfTextAtSize(`REPORT ID: ${report.reportId}`, 8), y: y - 12, size: 8, font: fontBold, color: C.muted,
    });
    page.drawLine({ start: { x: M, y: y - 34 }, end: { x: W - M, y: y - 34 }, thickness: 2, color: C.blue });
    y -= 52;

    // Candidate Banner
    page.drawRectangle({ x: M, y: y - 62, width: CW, height: 62, color: C.softBlue, borderColor: C.blue, borderWidth: 0.7 });
    page.drawRectangle({ x: M, y: y - 62, width: 5, height: 62, color: C.blue });
    page.drawText(clean(report.student.name), { x: M + 16, y: y - 24, size: 18, font: serifBold, color: C.navy });
    page.drawText(
      clean(`Date: ${report.dateFormatted}   |   Phone: ${report.student.phone}   |   Email: ${report.student.email}   |   Completed: ${report.answeredCount}/${report.totalQuestions}`),
      { x: M + 16, y: y - 46, size: 8.2, font, color: C.slate }
    );
    y -= 82;

    y = drawHeading(page, y, 'Executive Assessment Summary');
    y = drawPara(
      page, y,
      `This psychometric report evaluates ${report.student.name}'s responses across 76 Commerce work-activity statements, mapping innate preferences across 19 specialized Career Clusters in both the Financial and Non-Financial domains.`
    );
    y -= 6;

    // 4 KPI Stat Cards
    const kpis = [
      { big: report.preferredDomain.split(' ')[0], lbl: 'PREFERRED DOMAIN', sub: `${Math.max(report.financialPct, report.nonFinancialPct)}% Share`, col: C.blue },
      { big: `${report.top3[0].percentage}%`, lbl: 'PEAK AFFINITY', sub: report.top3[0].cluster.slice(0, 18), col: C.green },
      { big: `${report.overallIndexPct}%`, lbl: 'OVERALL INDEX', sub: `${report.totalRawScore} / 380 Pts`, col: C.indigo },
      { big: `${report.highCount} / 19`, lbl: 'HIGH-TIER CLUSTERS', sub: 'Primary Matches', col: C.amber },
    ];
    const cardW = (CW - 24) / 4;
    kpis.forEach((k, i) => {
      const cx = M + i * (cardW + 8);
      page.drawRectangle({ x: cx, y: y - 64, width: cardW, height: 64, color: C.cream, borderColor: C.border, borderWidth: 0.7 });
      page.drawRectangle({ x: cx, y: y - 4, width: cardW, height: 4, color: k.col });
      const bw = fontBold.widthOfTextAtSize(clean(k.big), 15);
      page.drawText(clean(k.big), { x: cx + (cardW - bw) / 2, y: y - 26, size: 15, font: fontBold, color: k.col });
      const lw = fontBold.widthOfTextAtSize(k.lbl, 6.5);
      page.drawText(k.lbl, { x: cx + (cardW - lw) / 2, y: y - 41, size: 6.5, font: fontBold, color: C.muted });
      const sw = font.widthOfTextAtSize(clean(k.sub), 7.2);
      page.drawText(clean(k.sub), { x: cx + (cardW - sw) / 2, y: y - 54, size: 7.2, font, color: C.slate });
    });
    y -= 84;

    // Top 5 Bar Chart
    y = drawHeading(page, y, 'Top 5 Career Clusters Snapshot');
    y = drawHorizBars(
      page, y - 4,
      report.top5.map((c) => ({ label: `#${c.rank} ${c.cluster}`, pct: c.percentage, sub: `${c.rawScore}/20`, level: c.level })),
      10, 26
    );
    y -= 10;

    drawInsight(
      page, y,
      `Executive Takeaway for ${report.student.name}`,
      `Your profile shows strongest alignment with ${report.top3.map((x) => x.cluster).join(', ')}, anchored within the ${report.preferredDomain}. Prioritize degree tracks and professional certifications that combine these top clusters.`
    );
  }

  // ==================== PAGE 2: METHODOLOGY & TIER DISTRIBUTION ====================
  {
    const { page, y: startY } = initPage(2, 'What This Report Gives You & Methodology');
    let y = startY;

    y = drawHeading(page, y, 'What This Report Gives You');
    const bullets = [
      'Brief knowledge about all available Commerce Careers, both in the financial and non-financial domain.',
      'An answer to which career option of Commerce you should opt for based on your innate inclinations.',
      'A scientifically designed psychometric analysis matching your activity choices with professional careers of Commerce.',
      'Results displayed in graphical forms - radar chart, domain analysis, interest level spectrum, and cluster tables.',
    ];
    bullets.forEach((b) => {
      y = drawPara(page, y, `>  ${b}`, 9, CW - 10, M + 6);
    });
    y -= 10;

    y = drawHeading(page, y, 'Psychometric Evaluation Architecture');
    const steps = [
      { n: '1', t: '76 Situational Items', d: '4 targeted statements per cluster rated on a 5-point Likert scale (max 20 pts/cluster).' },
      { n: '2', t: 'Domain Classification', d: 'Measures macro inclination across 8 Financial clusters versus 11 Non-Financial clusters.' },
      { n: '3', t: 'Relative Norm Tiering', d: `Classifies all 19 clusters into High (${report.highCount}), Medium (${report.mediumCount}), and Low (${report.lowCount}) bands.` },
    ];
    const sw = (CW - 16) / 3;
    steps.forEach((s, i) => {
      const sx = M + i * (sw + 8);
      page.drawRectangle({ x: sx, y: y - 92, width: sw, height: 92, color: C.cream, borderColor: C.border, borderWidth: 0.7 });
      page.drawRectangle({ x: sx, y: y - 4, width: sw, height: 4, color: C.blue });
      page.drawCircle({ x: sx + sw / 2, y: y - 24, size: 12, color: C.softBlue, borderColor: C.blue, borderWidth: 1.2 });
      page.drawText(s.n, { x: sx + sw / 2 - 3, y: y - 28, size: 10, font: fontBold, color: C.blue });
      const tw = fontBold.widthOfTextAtSize(s.t, 9);
      page.drawText(s.t, { x: sx + (sw - tw) / 2, y: y - 48, size: 9, font: fontBold, color: C.navy });
      const dLines = wrapText(s.d, font, 7.6, sw - 14);
      let dy = y - 61;
      dLines.forEach((dl) => {
        const dw = font.widthOfTextAtSize(dl, 7.6);
        page.drawText(dl, { x: sx + (sw - dw) / 2, y: dy, size: 7.6, font, color: C.muted });
        dy -= 10;
      });
    });
    y -= 114;

    y = drawHeading(page, y, 'Cluster Distribution Across Interest Tiers');
    y = drawHorizBars(
      page, y - 6,
      [
        { label: 'High Interest Tier (Primary Focus)', pct: Math.round((report.highCount / 19) * 100), sub: `${report.highCount} Clusters`, color: C.green },
        { label: 'Medium Interest Tier (Secondary / Electives)', pct: Math.round((report.mediumCount / 19) * 100), sub: `${report.mediumCount} Clusters`, color: C.amber },
        { label: 'Low Interest Tier (Avoid as Major)', pct: Math.round((report.lowCount / 19) * 100), sub: `${report.lowCount} Clusters`, color: C.rose },
      ],
      12, 30
    );
  }

  // ==================== PAGE 3: PREFERRED DOMAIN ANALYSIS ====================
  {
    const { page, y: startY } = initPage(3, 'Your Preferred Domain - Financial vs. Non-Financial');
    let y = startY;

    y = drawHeading(page, y, 'Macro Domain Inclination');
    y = drawPara(
      page, y,
      `${report.student.name}, the analysis indicates that your interests and aptitude are more inclined towards the ${report.preferredDomain}. Below is your comparative balance across both macro spheres of Commerce.`
    );
    y -= 6;

    // Split Segmented Progress Graphic
    const finW = (CW * report.financialPct) / 100;
    page.drawRectangle({ x: M, y: y - 28, width: finW, height: 28, color: C.blue });
    page.drawRectangle({ x: M + finW, y: y - 28, width: CW - finW, height: 28, color: C.green });
    page.drawText(`FINANCIAL ${report.financialPct}%`, { x: M + 10, y: y - 18, size: 10, font: fontBold, color: C.white });
    const nfLbl = `NON-FINANCIAL ${report.nonFinancialPct}%`;
    page.drawText(nfLbl, { x: W - M - fontBold.widthOfTextAtSize(nfLbl, 10) - 10, y: y - 18, size: 10, font: fontBold, color: C.white });
    y -= 48;

    // Financial Cluster Breakdown
    y = drawHeading(page, y, 'Financial Domain Cluster Breakdown (All 8 Clusters)');
    y = drawHorizBars(
      page, y - 4,
      report.financialClusters.map((c) => ({ label: c.cluster, pct: c.percentage, sub: `${c.rawScore}/20`, level: c.level, color: C.blue })),
      9, 25
    );
    y -= 10;

    drawInsight(
      page, y,
      'Domain Synthesis',
      `Your top Financial cluster is ${report.financialClusters[0].cluster} (${report.financialClusters[0].percentage}%) and your top Non-Financial cluster is ${report.nonFinancialClusters[0].cluster} (${report.nonFinancialClusters[0].percentage}%). Combining these two areas creates a strong technocratic-managerial profile.`
    );
  }

  // ==================== PAGE 4: VECTOR RADAR CHART (TOP 8) ====================
  {
    const { page, y: startY } = initPage(4, 'Interest Profile - Top 8 Clusters Radar');
    let y = startY;

    y = drawHeading(page, y, 'Multidimensional Competency Radar');
    y = drawPara(page, y, 'The radar chart below maps your top eight scoring Commerce clusters simultaneously. Vertices extending furthest toward the perimeter represent your strongest natural career anchors.');

    // Draw Vector Radar Chart
    const cx = W / 2;
    const cy = y - 135;
    const maxR = 98;
    const n = report.top8.length;

    // Concentric grid rings (25%, 50%, 75%, 100%)
    [0.25, 0.5, 0.75, 1.0].forEach((scale) => {
      const r = maxR * scale;
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

    // Axes & Labels
    const pts: Array<{ x: number; y: number }> = [];
    report.top8.forEach((c, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const ax = cx + maxR * Math.cos(angle);
      const ay = cy + maxR * Math.sin(angle);
      page.drawLine({ start: { x: cx, y: cy }, end: { x: ax, y: ay }, thickness: 0.6, color: C.border });

      const vr = maxR * (c.percentage / 100);
      pts.push({ x: cx + vr * Math.cos(angle), y: cy + vr * Math.sin(angle) });

      const lbl = clean(c.cluster.length > 20 ? c.cluster.slice(0, 18) + '..' : c.cluster);
      const lx = cx + (maxR + 18) * Math.cos(angle);
      const ly = cy + (maxR + 14) * Math.sin(angle);
      const lw = fontBold.widthOfTextAtSize(lbl, 7.5);
      page.drawText(lbl, { x: lx - lw / 2, y: ly - 3, size: 7.5, font: fontBold, color: C.navy });
    });

    // Data Polygon Edges & Points
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      page.drawLine({ start: p1, end: p2, thickness: 2.2, color: C.blue });
    }
    pts.forEach((p) => {
      page.drawCircle({ x: p.x, y: p.y, size: 3.5, color: C.blue });
    });

    y = cy - maxR - 36;

    // Top 6 Vertex Summary Table
    y = drawHeading(page, y, 'Top 6 Radar Vertices Summary');
    y = drawClusterTable(page, y, report.top8.slice(0, 6));
  }

  // ==================== PAGE 5: COMPLETE 19-CLUSTER SPECTRUM ====================
  {
    const { page, y: startY } = initPage(5, 'Interest Level Graph - Complete 19-Cluster Spectrum');
    let y = startY;

    y = drawHeading(page, y, 'All 19 Commerce Clusters Ranked by Affinity');
    y = drawHorizBars(
      page, y - 4,
      report.sortedClusters.map((c) => ({
        label: `#${c.rank}  ${c.cluster} (${c.domain})`,
        pct: c.percentage,
        sub: `${c.rawScore}/20`,
        level: c.level,
      })),
      7.5, 22
    );
  }

  // ==================== PAGE 6: DESCRIPTORS & NON-FINANCIAL BREAKDOWN ====================
  {
    const { page, y: startY } = initPage(6, 'Interest Level Descriptors & Non-Financial Analysis');
    let y = startY;

    y = drawHeading(page, y, 'Interest Level Descriptors');
    LEVEL_DESCRIPTORS.forEach((d) => {
      const col = levelColors(d.level);
      const lines = wrapText(d.description, font, 8.2, CW - 92);
      const boxH = Math.max(44, lines.length * 11.5 + 14);
      page.drawRectangle({ x: M, y: y - boxH, width: CW, height: boxH, color: col.bg, borderColor: col.fg, borderWidth: 0.6 });
      drawBadge(page, M + 10, y - 22, d.level);
      let ty = y - 14;
      lines.forEach((l) => {
        page.drawText(l, { x: M + 74, y: ty, size: 8.2, font, color: C.slate });
        ty -= 11.5;
      });
      y -= boxH + 8;
    });

    y -= 6;
    y = drawHeading(page, y, 'Non-Financial Domain Breakdown (Top 8 Clusters)');
    drawHorizBars(
      page, y - 4,
      report.nonFinancialClusters.slice(0, 8).map((c) => ({
        label: c.cluster, pct: c.percentage, sub: `${c.rawScore}/20`, level: c.level, color: C.green,
      })),
      8, 22
    );
  }

  // ==================== PAGES 7-9: CLUSTER TABLES PARTS 1-3 ====================
  const pageConfigs = [
    {
      pg: 7,
      title: 'Career Clusters & Options (Part 1 of 4)',
      sub: 'Clusters 1 to 5 - Quantitative & Digital Foundations',
      slice: report.allClustersInOrder.slice(0, 5),
      noteTitle: 'Pathway Note - Quantitative vs. Digital Media',
      noteBody: 'Students scoring High in Accounts/Taxation and Financial Auditing thrive in Chartered Accountancy (CA), CMA, and Forensic Accounting, while high scorers in Analytics and Computer Designing excel in Business Intelligence and UI/UX Product roles.',
    },
    {
      pg: 8,
      title: 'Career Clusters & Options (Part 2 of 4)',
      sub: 'Clusters 6 to 10 - Institutional Finance & Service Operations',
      slice: report.allClustersInOrder.slice(5, 10),
      noteTitle: 'Pathway Note - Capital Markets & Institutional Finance',
      noteBody: 'High scores across Banking, Credit Management, and Financial Management align strongly with B.Com (Hons), BBA (Finance), BA (Hons) Economics, and global credentials such as CFA and FRM.',
    },
    {
      pg: 9,
      title: 'Career Clusters & Options (Part 3 of 4)',
      sub: 'Clusters 11 to 15 - Regulatory, Creative & Linguistic Tracks',
      slice: report.allClustersInOrder.slice(10, 15),
      noteTitle: 'Pathway Note - Law, Journalism & Design',
      noteBody: 'Commerce students with strong Law affinities frequently pair B.Com/BBA with LLB (5-year integrated law via CLAT) or pursue Company Secretaryship (CS) to lead corporate governance and regulatory compliance.',
    },
  ];

  pageConfigs.forEach((cfg) => {
    const { page, y: startY } = initPage(cfg.pg, cfg.title);
    let y = startY;
    y = drawHeading(page, y, cfg.sub);
    y = drawClusterTable(page, y, cfg.slice);
    drawInsight(page, y - 4, cfg.noteTitle, cfg.noteBody);
  });

  // ==================== PAGE 10: CLUSTERS PART 4 & ACTION PLAN ====================
  {
    const { page, y: startY } = initPage(10, 'Career Clusters (Part 4 of 4) & Action Plan');
    let y = startY;

    y = drawHeading(page, y, 'Clusters 16 to 19 - Management, Social Sciences, Education & Trading');
    y = drawClusterTable(page, y, report.allClustersInOrder.slice(15, 19));
    y -= 4;

    y = drawHeading(page, y, `Actions & Next Steps for ${report.student.name}`);
    y = drawPara(
      page, y,
      `Focus primarily on the clusters marked HIGH - specifically ${report.top3.map((x) => x.cluster).join(', ')}. Execute the three-step academic roadmap below:`
    );
    y -= 4;

    const actions = [
      { n: '1', t: 'Shortlist Top Clusters', d: `Prioritize ${report.top3[0].cluster} (${report.top3[0].percentage}%) and ${report.top3[1].cluster} (${report.top3[1].percentage}%) for your UG specialization.` },
      { n: '2', t: 'Counselor Review', d: `Map entrance exams (CUET, IPMAT, CLAT, CA/CS Foundation) aligned with your ${report.preferredDomain}.` },
      { n: '3', t: 'Skill & Certifications', d: 'Pair your degree with practical internships and certifications targeting your High-level clusters.' },
    ];
    const aw = (CW - 16) / 3;
    actions.forEach((a, i) => {
      const ax = M + i * (aw + 8);
      page.drawRectangle({ x: ax, y: y - 82, width: aw, height: 82, color: C.cream, borderColor: C.border, borderWidth: 0.7 });
      page.drawRectangle({ x: ax, y: y - 4, width: aw, height: 4, color: C.green });
      page.drawText(`${a.n}. ${a.t}`, { x: ax + 8, y: y - 20, size: 8.5, font: fontBold, color: C.navy });
      const lines = wrapText(a.d, font, 7.6, aw - 16);
      let dy = y - 34;
      lines.forEach((l) => {
        page.drawText(l, { x: ax + 8, y: dy, size: 7.6, font, color: C.slate });
        dy -= 10.5;
      });
    });
    y -= 94;

    drawInsight(
      page, y,
      'Final Counselor Summary',
      `${report.student.name}'s highest career sustainability lies at the intersection of ${report.top3[0].cluster} and ${report.top3[1].cluster}. Revisit this report every 6 months to track academic milestones.`
    );
  }

  return pdf.save();
}
