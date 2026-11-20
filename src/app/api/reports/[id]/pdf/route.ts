// Unified PDF report route — single dynamic endpoint that generates the
// colorful multi-page A4 pdf-lib report for ANY of the 9 tests.
//
// NOTE on the dynamic segment name: Next.js forbids two different slug names
// at the same route level. The platform already has /api/reports/[id]/*, so
// this route reuses the [id] segment name — the value is interpreted as the
// unified testId (e.g. POST /api/reports/commerce/pdf). The URL contract
// matches the unified TestRunner's fetch: /api/reports/${testId}/pdf.
//
// This endpoint is STATELESS: it renders a PDF purely from client-supplied
// answers and touches no database, so it does not bypass the platform's
// auth/payment-gated download route (/api/reports/[id]/download) which remains
// the path for stored, access-controlled reports.

import { NextRequest, NextResponse } from 'next/server';
import { getTestConfig } from '@/tests';
import { getReportConfig } from '@/reports/reportConfigs';
import { evaluateTest, toUnifiedAnswerMap, AnswerMap } from '@/scoring/scoringEngine';
import { generateUnifiedReportPdf } from '@/pdf-generator/generateReportPdf';
import { BrandingConfig, GradeLevel, StudentInfo, TestId } from '@/types/assessment';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await context.params;
    const config = getTestConfig(testId as TestId);
    const template = getReportConfig(testId as TestId);

    if (!config || !template) {
      return NextResponse.json({ error: `Unknown testId: ${testId}` }, { status: 404 });
    }

    const body = (await req.json()) as {
      student: StudentInfo;
      answers?: AnswerMap;
      /** Platform format: question orderIndex -> selected option LABEL. */
      labelAnswers?: Record<number, string>;
      branding?: BrandingConfig;
    };

    if (!body?.student?.name || (!body?.answers && !body?.labelAnswers)) {
      return NextResponse.json({ error: 'student and answers (or labelAnswers) are required.' }, { status: 400 });
    }

    const student: StudentInfo = {
      name: body.student.name,
      email: body.student.email || '',
      phone: body.student.phone || '',
      grade: body.student.grade as GradeLevel | undefined,
    };

    const answers: AnswerMap = body.labelAnswers
      ? toUnifiedAnswerMap(config, student, body.labelAnswers)
      : (body.answers || {});

    const result = evaluateTest(config, student, answers);
    const pdfBytes = await generateUnifiedReportPdf(result, template, body.branding);
    const safeName = body.student.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${testId}_report_${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Unified PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF report.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
