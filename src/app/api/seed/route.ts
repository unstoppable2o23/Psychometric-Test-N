import { db } from '@/lib/db'
import { seedDatabase } from '@/lib/assessments/seed'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, json, error } from '@/lib/api'
import { audit } from '@/lib/audit'

// First-run seeding is allowed without auth (so the platform can bootstrap).
// Re-seeding requires Super Admin.
// This endpoint ALSO creates the database tables if they don't exist (for
// Vercel deployments where prisma db push can't run during build).
export const POST = apiHandler(async () => {
  // Step 1: Ensure tables exist (raw SQL — works even if schema not pushed)
  const tableSQL = [
    `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "phone" TEXT, "name" TEXT NOT NULL, "role" TEXT NOT NULL, "passwordHash" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"), CONSTRAINT "User_email_key" UNIQUE ("email"))`,
    `CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "token" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"), CONSTRAINT "Session_token_key" UNIQUE ("token"))`,
    `CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token")`,
    `CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId")`,
    `CREATE TABLE IF NOT EXISTS "Assessment" ("id" TEXT NOT NULL, "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "shortTitle" TEXT, "description" TEXT NOT NULL, "purpose" TEXT NOT NULL, "targetPopulation" TEXT, "instructions" TEXT NOT NULL, "estimatedMinutes" INTEGER NOT NULL, "category" TEXT NOT NULL, "totalQuestions" INTEGER NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id"), CONSTRAINT "Assessment_slug_key" UNIQUE ("slug"))`,
    `CREATE TABLE IF NOT EXISTS "Question" ("id" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "orderIndex" INTEGER NOT NULL, "sectionId" TEXT, "sectionName" TEXT, "text" TEXT NOT NULL, "questionType" TEXT NOT NULL, "options" TEXT NOT NULL, "dimension" TEXT, "scoring" TEXT NOT NULL, "isReverse" BOOLEAN NOT NULL DEFAULT false, "correctAnswer" TEXT, CONSTRAINT "Question_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "Question_assessmentId_idx" ON "Question"("assessmentId")`,
    `CREATE TABLE IF NOT EXISTS "Assignment" ("id" TEXT NOT NULL, "studentId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "assignedById" TEXT NOT NULL, "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "Assignment_studentId_idx" ON "Assignment"("studentId")`,
    `CREATE INDEX IF NOT EXISTS "Assignment_assessmentId_idx" ON "Assignment"("assessmentId")`,
    `CREATE TABLE IF NOT EXISTS "AccessToken" ("id" TEXT NOT NULL, "assignmentId" TEXT NOT NULL, "token" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id"), CONSTRAINT "AccessToken_token_key" UNIQUE ("token"))`,
    `CREATE INDEX IF NOT EXISTS "AccessToken_token_idx" ON "AccessToken"("token")`,
    `CREATE INDEX IF NOT EXISTS "AccessToken_assignmentId_idx" ON "AccessToken"("assignmentId")`,
    `CREATE TABLE IF NOT EXISTS "Attempt" ("id" TEXT NOT NULL, "assignmentId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "status" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3), "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "Attempt_studentId_idx" ON "Attempt"("studentId")`,
    `CREATE INDEX IF NOT EXISTS "Attempt_assignmentId_idx" ON "Attempt"("assignmentId")`,
    `CREATE TABLE IF NOT EXISTS "Answer" ("id" TEXT NOT NULL, "attemptId" TEXT NOT NULL, "questionId" TEXT NOT NULL, "questionOrder" INTEGER NOT NULL, "selectedOption" TEXT NOT NULL, "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Answer_pkey" PRIMARY KEY ("id"), CONSTRAINT "Answer_attemptId_questionId_key" UNIQUE ("attemptId", "questionId"))`,
    `CREATE INDEX IF NOT EXISTS "Answer_attemptId_idx" ON "Answer"("attemptId")`,
    `CREATE TABLE IF NOT EXISTS "ScoreResult" ("id" TEXT NOT NULL, "attemptId" TEXT NOT NULL, "dimensions" TEXT NOT NULL, "totalScore" INTEGER, "recommendation" TEXT, "topDimensions" TEXT, "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ScoreResult_pkey" PRIMARY KEY ("id"), CONSTRAINT "ScoreResult_attemptId_key" UNIQUE ("attemptId"))`,
    `CREATE TABLE IF NOT EXISTS "Report" ("id" TEXT NOT NULL, "attemptId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "accessLevel" TEXT NOT NULL, "paymentRequired" BOOLEAN NOT NULL DEFAULT true, "paymentStatus" TEXT NOT NULL, "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Report_pkey" PRIMARY KEY ("id"), CONSTRAINT "Report_attemptId_key" UNIQUE ("attemptId"))`,
    `CREATE INDEX IF NOT EXISTS "Report_studentId_idx" ON "Report"("studentId")`,
    `CREATE TABLE IF NOT EXISTS "CounsellorStudent" ("id" TEXT NOT NULL, "counsellorId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "assignedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CounsellorStudent_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "CounsellorStudent_counsellorId_idx" ON "CounsellorStudent"("counsellorId")`,
    `CREATE INDEX IF NOT EXISTS "CounsellorStudent_studentId_idx" ON "CounsellorStudent"("studentId")`,
    `CREATE TABLE IF NOT EXISTS "CounsellorReportAccess" ("id" TEXT NOT NULL, "counsellorId" TEXT NOT NULL, "reportId" TEXT NOT NULL, "grantedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CounsellorReportAccess_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "CounsellorReportAccess_counsellorId_idx" ON "CounsellorReportAccess"("counsellorId")`,
    `CREATE TABLE IF NOT EXISTS "CounsellorAllocation" ("id" TEXT NOT NULL, "counsellorId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "used" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CounsellorAllocation_pkey" PRIMARY KEY ("id"), CONSTRAINT "CounsellorAllocation_counsellorId_assessmentId_key" UNIQUE ("counsellorId", "assessmentId"))`,
    `CREATE INDEX IF NOT EXISTS "CounsellorAllocation_counsellorId_idx" ON "CounsellorAllocation"("counsellorId")`,
    `CREATE TABLE IF NOT EXISTS "InterpretationManual" ("id" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "InterpretationManual_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "InterpretationManual_assessmentId_idx" ON "InterpretationManual"("assessmentId")`,
    `CREATE TABLE IF NOT EXISTS "PaymentTransaction" ("id" TEXT NOT NULL, "reportId" TEXT NOT NULL, "studentId" TEXT NOT NULL, "amount" DOUBLE PRECISION NOT NULL, "currency" TEXT NOT NULL DEFAULT 'INR', "gateway" TEXT, "gatewayRef" TEXT, "status" TEXT NOT NULL, "paidAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "PaymentTransaction_reportId_idx" ON "PaymentTransaction"("reportId")`,
    `CREATE TABLE IF NOT EXISTS "AuditLog" ("id" TEXT NOT NULL, "actorId" TEXT, "actorRole" TEXT, "action" TEXT NOT NULL, "targetType" TEXT, "targetId" TEXT, "metadata" TEXT, "ip" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"))`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId")`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action")`,
    // Anonymous Test Links table
    `CREATE TABLE IF NOT EXISTS "AnonymousTestLink" ("id" TEXT NOT NULL, "token" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "createdById" TEXT NOT NULL, "studentId" TEXT, "assignmentId" TEXT, "reportId" TEXT, "status" TEXT NOT NULL DEFAULT 'UNUSED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AnonymousTestLink_pkey" PRIMARY KEY ("id"), CONSTRAINT "AnonymousTestLink_token_key" UNIQUE ("token"))`,
    `CREATE INDEX IF NOT EXISTS "AnonymousTestLink_token_idx" ON "AnonymousTestLink"("token")`,
    `CREATE INDEX IF NOT EXISTS "AnonymousTestLink_assessmentId_idx" ON "AnonymousTestLink"("assessmentId")`,
  ]
  for (const sql of tableSQL) {
    try { await db.$executeRawUnsafe(sql) } catch (e: any) { if (!e.message?.includes('already exists')) console.error('SQL:', e.message?.slice(0, 80)) }
  }

  // Step 2: Check if already seeded
  const user = await getCurrentUser()
  let adminExists
  try {
    adminExists = await db.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  } catch {
    // If findFirst fails (column mismatch), try raw SQL
    const result = await db.$queryRawUnsafe('SELECT * FROM "User" WHERE "role" = $1 LIMIT 1', 'SUPER_ADMIN') as any[]
    adminExists = result?.[0] || null
  }
  if (adminExists && (!user || user.role !== 'SUPER_ADMIN')) {
    return error('Seeding is restricted to Super Admin after initial setup', 403)
  }

  // Step 3: Seed
  const result = await seedDatabase()
  await audit('SEED_DATABASE', { actor: user, targetType: 'SYSTEM', metadata: result })
  return json({ ok: true, ...result })
})

export const dynamic = 'force-dynamic'
