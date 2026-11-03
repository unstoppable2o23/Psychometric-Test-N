// Database seed: loads all assessments, questions, interpretation manuals,
// and a default Super Admin account. Idempotent — safe to run repeatedly.

import { db } from '@/lib/db'
import { ASSESSMENTS } from '@/lib/assessments/loader'
import { buildManual } from '@/lib/assessments/manuals'
import { hashPassword } from '@/lib/auth'

export async function seedDatabase() {
  let adminCount = 0
  // 1. Ensure a default Super Admin exists
  const existingAdmin = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (!existingAdmin) {
    await db.user.create({
      data: {
        email: 'admin@psychometric.test',
        name: 'Super Admin',
        phone: '9000000000',
        role: 'SUPER_ADMIN',
        passwordHash: hashPassword('Admin@123'),
        isActive: true,
      },
    })
    adminCount = 1
  }

  // 2. Upsert assessments + questions + manuals
  let assessmentCount = 0, questionCount = 0, manualCount = 0
  for (const a of ASSESSMENTS) {
    const existing = await db.assessment.findUnique({ where: { slug: a.slug } })
    const data = {
      title: a.title,
      shortTitle: a.shortTitle,
      description: a.description,
      purpose: a.purpose,
      targetPopulation: a.targetPopulation,
      instructions: a.instructions,
      estimatedMinutes: a.estimatedMinutes,
      category: a.category,
      totalQuestions: a.questions.length,
    }
    const assessment = existing
      ? await db.assessment.update({ where: { slug: a.slug }, data })
      : await db.assessment.create({ data: { slug: a.slug, ...data } })
    assessmentCount++

    // Replace questions (delete + recreate to keep it simple & idempotent)
    await db.question.deleteMany({ where: { assessmentId: assessment.id } })
    for (const q of a.questions) {
      await db.question.create({
        data: {
          assessmentId: assessment.id,
          orderIndex: q.orderIndex,
          sectionId: q.sectionId ?? null,
          sectionName: q.sectionName ?? null,
          text: q.text,
          questionType: q.questionType,
          options: JSON.stringify(q.options),
          dimension: q.dimension ?? null,
          scoring: JSON.stringify(q.scoring),
          isReverse: q.isReverse,
        },
      })
      questionCount++
    }

    // Upsert interpretation manual
    const manual = buildManual(a)
    await db.interpretationManual.deleteMany({ where: { assessmentId: assessment.id } })
    await db.interpretationManual.create({
      data: { assessmentId: assessment.id, title: manual.title, content: JSON.stringify(manual) },
    })
    manualCount++
  }

  return {
    adminCreated: adminCount,
    assessments: assessmentCount,
    questions: questionCount,
    manuals: manualCount,
  }
}
