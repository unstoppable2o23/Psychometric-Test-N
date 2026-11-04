import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { apiHandler, error } from '@/lib/api'
import { generateManualPdfFile } from '@/lib/pdf'
import fs from 'fs/promises'

// GET /api/manuals/[assessmentId]/download — counsellor/admin only PDF.
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ assessmentId: string }> }) => {
  const user = await getCurrentUser()
  if (!user) return error('Authentication required', 401)
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'COUNSELLOR') {
    return error('Only administrators and counsellors may download interpretation manuals', 403)
  }
  const { assessmentId } = await params
  const manual = await db.interpretationManual.findFirst({ where: { assessmentId }, include: { assessment: true } })
  if (!manual) return error('Manual not found', 404)
  const content = JSON.parse(manual.content)
  const pdfPath = await generateManualPdfFile(content, `manual-${assessmentId}`)
  const buf = await fs.readFile(pdfPath)
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="manual-${manual.assessment.slug}.pdf"`,
      'Content-Length': String(buf.length),
    },
  })
})

export const dynamic = 'force-dynamic'
