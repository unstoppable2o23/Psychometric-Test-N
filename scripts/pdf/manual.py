#!/usr/bin/env python3
"""
Counsellor interpretation manual PDF generator (ReportLab, A4).
Usage: python3 manual.py <input_json_path> <output_pdf_path>
Input JSON: the ManualContent object (see src/lib/assessments/manuals.ts)
"""
import sys, json
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)
from reportlab.pdfgen import canvas

NAVY = colors.HexColor("#0F2A43")
PLUM = colors.HexColor("#5B21B6")
TEAL = colors.HexColor("#0E7C66")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F5F3FF")
BORDER = colors.HexColor("#CBD5E1")
AMBER = colors.HexColor("#B45309")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN


def header_footer(canv: canvas.Canvas, doc):
    canv.saveState()
    canv.setFillColor(PLUM)
    canv.rect(0, PAGE_H - 14 * mm, PAGE_W, 14 * mm, fill=1, stroke=0)
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 10)
    canv.drawString(MARGIN, PAGE_H - 9 * mm, "Counsellor Interpretation Manual")
    canv.setFont("Helvetica", 8)
    canv.drawRightString(PAGE_W - MARGIN, PAGE_H - 9 * mm, "CONFIDENTIAL — For Authorised Counsellors Only")
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.5)
    canv.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
    canv.setFillColor(MUTED)
    canv.setFont("Helvetica", 7.5)
    canv.drawString(MARGIN, 8 * mm, "This manual contains confidential interpretation guidance. Not for distribution to students or the public.")
    canv.drawRightString(PAGE_W - MARGIN, 8 * mm, f"Page {doc.page}")
    canv.restoreState()


def build(m, out_path):
    styles = getSampleStyleSheet()
    H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=17, textColor=PLUM, spaceAfter=6, leading=21)
    H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, textColor=TEAL, spaceBefore=12, spaceAfter=4, leading=15)
    BODY = ParagraphStyle("Body", parent=styles["Normal"], fontSize=9.5, textColor=SLATE, leading=13.5, spaceAfter=4)
    SMALL = ParagraphStyle("Small", parent=styles["Normal"], fontSize=8.5, textColor=MUTED, leading=11.5)
    BULLET = ParagraphStyle("Bullet", parent=BODY, leftIndent=12, bulletIndent=2, spaceAfter=2)

    story = []
    story.append(Paragraph(m.get("title", "Interpretation Manual"), H1))
    story.append(Spacer(1, 6))

    def section(heading, text):
        return [Paragraph(heading, H2), Paragraph(text, BODY), Spacer(1, 4)]

    story += section("Purpose", m.get("purpose", ""))
    story += section("Psychological Constructs Measured", m.get("constructsMeasured", ""))
    story += section("Target Population", m.get("targetPopulation", ""))
    story += section("Scoring Methodology", m.get("scoringMethodology", ""))

    # Dimensions table
    dims = m.get("dimensions", [])
    if dims:
        story.append(Paragraph("Dimensions & Interpretation Bands", H2))
        rows = [["Dimension", "High", "Moderate", "Low"]]
        for d in dims:
            rows.append([
                Paragraph(f"<b>{d['name']}</b><br/><font size=7 color='#64748B'>{d.get('description','')[:90]}</font>", SMALL),
                Paragraph(d.get("high", "")[:160], SMALL),
                Paragraph(d.get("moderate", "")[:160], SMALL),
                Paragraph(d.get("low", "")[:160], SMALL),
            ])
        dt = Table(rows, colWidths=[42 * mm, 44 * mm, 44 * mm, 44 * mm], repeatRows=1)
        dt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PLUM),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
            ("GRID", (0, 0), (-1, -1), 0.25, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(dt)
        story.append(Spacer(1, 8))

    story += section("Behavioural Indicators to Observe", "")
    for b in m.get("behaviouralIndicators", []):
        story.append(Paragraph(f"• {b}", BULLET))

    story += section("Strengths & Development Areas", m.get("strengthsAndDevelopment", ""))
    story += section("Counselling Approach", m.get("counsellingApproach", ""))
    story += section("Assessment Limitations", m.get("limitations", ""))
    story += section("Sample Interpretation", m.get("sampleInterpretation", ""))

    doc = BaseDocTemplate(out_path, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=20 * mm, bottomMargin=16 * mm,
                          title=m.get("title", "Interpretation Manual"), author="Psychometric Testing Platform",
                          subject="Counsellor Interpretation Manual", creator="Psychometric Testing Platform")
    frame = Frame(MARGIN, 16 * mm, CONTENT_W, PAGE_H - 36 * mm, id="main", showBoundary=0)
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])
    doc.build(story)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: manual.py <input_json> <output_pdf>", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)
    build(data, sys.argv[2])
    print(f"OK {sys.argv[2]}", file=sys.stdout)
