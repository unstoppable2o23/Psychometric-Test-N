import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { generateSecureToken, hashPassword } from '@/lib/auth'
import { getAssessment } from '@/lib/assessments/loader'
import { scoreAttempt } from '@/lib/scoring'
import { audit } from '@/lib/audit'

// POST /api/test/submit — Server-side answer storage & scoring.
// Called by the HTML test pages when a student completes a test.
// ALL scoring happens here. Answer keys are NEVER exposed to the client.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { slug, name, email, phone, answers } = body
  if (!slug || !name || !email || !answers) {
    return Response.json({ error: 'slug, name, email, and answers are required' }, { status: 400 })
  }

  const normAssessment = getAssessment(slug)
  if (!normAssessment) {
    return Response.json({ error: 'Invalid test type' }, { status: 400 })
  }

  // 1. Find or create student
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

  // 2. Find assessment in DB
  const assessment = await db.assessment.findUnique({ where: { slug } })
  if (!assessment) {
    return Response.json({ error: 'Assessment not found' }, { status: 500 })
  }

  // 3. Check if student already completed this test
  const existingComplete = await db.assignment.findFirst({
    where: { studentId: student.id, assessmentId: assessment.id, status: 'COMPLETED' },
  })
  if (existingComplete) {
    return Response.json({ error: 'You have already completed this test' }, { status: 409 })
  }

  // 4. Create assignment + attempt
  const assignment = await db.assignment.create({
    data: {
      studentId: student.id, assessmentId: assessment.id,
      assignedById: student.id, status: 'IN_PROGRESS',
    },
  })
  const attempt = await db.attempt.create({
    data: {
      assignmentId: assignment.id, studentId: student.id,
      assessmentId: assessment.id, status: 'IN_PROGRESS',
    },
  })

  // 5. Store & validate ALL answers server-side
  let validCount = 0
  for (const [orderStr, selectedOption] of Object.entries(answers)) {
    const orderIndex = parseInt(orderStr, 10)
    const q = normAssessment.questions[orderIndex]
    if (!q) continue
    // Server-side validation — reject invalid options
    if (!q.options.includes(selectedOption as string)) continue

    const dbQ = await db.question.findFirst({
      where: { assessmentId: assessment.id, orderIndex },
    })
    if (dbQ) {
      await db.answer.create({
        data: {
          attemptId: attempt.id, questionId: dbQ.id,
          questionOrder: orderIndex, selectedOption: selectedOption as string,
        },
      })
      validCount++
    }
  }

  if (validCount === 0) {
    return Response.json({ error: 'No valid answers received' }, { status: 400 })
  }

  // 6. SCORE ENTIRELY ON SERVER — scoring logic never reaches the browser
  const dbAnswers = await db.answer.findMany({ where: { attemptId: attempt.id } })
  const answerMap: Record<number, string> = {}
  for (const a of dbAnswers) answerMap[a.questionOrder] = a.selectedOption

  const result = scoreAttempt(normAssessment, answerMap)

  // 7. Store server-computed scores
  await db.scoreResult.create({
    data: {
      attemptId: attempt.id,
      dimensions: JSON.stringify(result.dimensions),
      totalScore: result.totalScore ?? null,
      recommendation: result.recommendation ?? null,
      topDimensions: JSON.stringify(result.topDimensions ?? []),
    },
  })

  // 8. Generate report
  const report = await db.report.create({
    data: {
      attemptId: attempt.id, studentId: student.id, assessmentId: assessment.id,
      accessLevel: 'ADMIN_COUNSELLOR', paymentRequired: true, paymentStatus: 'NOT_REQUIRED',
    },
  })

  // 9. Close attempt + assignment
  await db.attempt.update({
    where: { id: attempt.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
  await db.assignment.update({
    where: { id: assignment.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  await audit('TEST_SUBMITTED_SERVER_SIDE', {
    actor: { id: student.id, role: 'STUDENT' },
    targetType: 'ATTEMPT', targetId: attempt.id,
    metadata: { reportId: report.id, slug, answersCount: validCount },
  })

  // Return ONLY safe data — no answer keys, no scoring logic
  return Response.json({
    ok: true,
    reportId: report.id,
    studentName: student.name,
    recommendation: result.recommendation,
    topDimensions: result.topDimensions,
    dimensions: result.dimensions.map(d => ({
      name: d.name, score: d.score, maxScore: d.maxScore, pct: d.pct, level: d.level,
    })),
  })
}

export const dynamic = 'force-dynamic'
