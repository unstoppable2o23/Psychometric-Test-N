import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { generateSecureToken, hashPassword } from '@/lib/auth'
import { getAssessment } from '@/lib/assessments/loader'
import { scoreAttempt } from '@/lib/scoring'
import { audit } from '@/lib/audit'

// Map slug to HTML test file
const SLUG_TO_HTML: Record<string, string> = {
  'commerce-branch': '/tests/commerce-branch-selector.html',
  'engineering-branch': '/tests/engineering-branch-selector.html',
  'humanities-branch': '/tests/humanities-branch-selector.html',
  'ideal-career': '/tests/ideal-career.html',
  'learning-style': '/tests/learning-styles.html',
  'multi-dimensional': '/tests/multi-dimensional.html',
  'multiple-intelligence': '/tests/multiple-intelligence.html',
  'personality': '/tests/personality-test.html',
  'stream-selector': '/tests/stream-selector.html',
}

// GET /test/[slug] — redirect to the HTML test file
// The slug is the unique test ID (e.g., /test/personality)
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const htmlPath = SLUG_TO_HTML[slug]
  if (!htmlPath) {
    return new Response('Test not found', { status: 404 })
  }
  // Redirect to the HTML test file
  return Response.redirect(new URL(htmlPath, req.url), 302)
}

// POST /test/[slug] — SERVER-SIDE answer submission & scoring
// Called by the HTML test page when the student completes the test.
// All scoring happens here — answer keys are NEVER exposed to the frontend.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const normAssessment = getAssessment(slug)
  if (!normAssessment) {
    return Response.json({ error: 'Invalid test' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, email, phone, answers } = body
  if (!name || !email || !answers) {
    return Response.json({ error: 'Name, email, and answers are required' }, { status: 400 })
  }

  // 1. Find or create the student account
  let student = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!student) {
    student = await db.user.create({
      data: {
        name, email: email.toLowerCase(), phone: phone || null,
        role: 'STUDENT', passwordHash: hashPassword(generateSecureToken(16)),
        isActive: true,
      },
    })
  }

  // 2. Find or create the assessment record
  let assessment = await db.assessment.findUnique({ where: { slug } })
  if (!assessment) {
    return Response.json({ error: 'Assessment not found in database' }, { status: 500 })
  }

  // 3. Create assignment + attempt
  const assignment = await db.assignment.create({
    data: {
      studentId: student.id,
      assessmentId: assessment.id,
      assignedById: student.id, // self-assigned via unique link
      status: 'IN_PROGRESS',
    },
  })

  const attempt = await db.attempt.create({
    data: {
      assignmentId: assignment.id,
      studentId: student.id,
      assessmentId: assessment.id,
      status: 'IN_PROGRESS',
    },
  })

  // 4. Store all answers SERVER-SIDE (answer keys are never sent to the client)
  // The "answers" object maps question order index -> selected option text
  for (const [orderStr, selectedOption] of Object.entries(answers)) {
    const orderIndex = parseInt(orderStr, 10)
    const q = normAssessment.questions[orderIndex]
    if (!q) continue

    // Validate the answer server-side
    if (!q.options.includes(selectedOption as string)) continue

    const dbQ = await db.question.findFirst({
      where: { assessmentId: assessment.id, orderIndex },
    })
    if (dbQ) {
      await db.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: dbQ.id,
          questionOrder: orderIndex,
          selectedOption: selectedOption as string,
        },
      })
    }
  }

  // 5. SCORE ENTIRELY ON THE SERVER — the client never sees scoring logic
  const dbAnswers = await db.answer.findMany({ where: { attemptId: attempt.id } })
  const answerMap: Record<number, string> = {}
  for (const a of dbAnswers) answerMap[a.questionOrder] = a.selectedOption

  const result = scoreAttempt(normAssessment, answerMap)

  // 6. Store the score result
  await db.scoreResult.create({
    data: {
      attemptId: attempt.id,
      dimensions: JSON.stringify(result.dimensions),
      totalScore: result.totalScore ?? null,
      recommendation: result.recommendation ?? null,
      topDimensions: JSON.stringify(result.topDimensions ?? []),
    },
  })

  // 7. Generate a report
  const report = await db.report.create({
    data: {
      attemptId: attempt.id,
      studentId: student.id,
      assessmentId: assessment.id,
      accessLevel: 'ADMIN_COUNSELLOR',
      paymentRequired: true,
      paymentStatus: 'NOT_REQUIRED',
    },
  })

  // 8. Close attempt + assignment
  await db.attempt.update({
    where: { id: attempt.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
  await db.assignment.update({
    where: { id: assignment.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  await audit('TEST_SUBMITTED_VIA_LINK', {
    actor: { id: student.id, role: 'STUDENT' },
    targetType: 'ATTEMPT',
    targetId: attempt.id,
    metadata: { reportId: report.id, slug, recommendation: result.recommendation },
  })

  // Return ONLY the computed scores (no answer keys)
  return Response.json({
    ok: true,
    reportId: report.id,
    studentName: student.name,
    recommendation: result.recommendation,
    topDimensions: result.topDimensions,
    dimensions: result.dimensions.map(d => ({
      name: d.name,
      score: d.score,
      maxScore: d.maxScore,
      pct: d.pct,
      level: d.level,
    })),
  })
}

export const dynamic = 'force-dynamic'
