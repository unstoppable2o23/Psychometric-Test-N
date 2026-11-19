// PDF generation helper — returns Buffers (works on Vercel serverless)
import { generateReportPdf, generateManualPdf, ReportPdfData, ManualContent } from '@/lib/pdfkit-generator'

export async function generateReportPdfFile(data: ReportPdfData, id: string): Promise<Buffer> {
  return generateReportPdf(data, id)
}

export async function generateManualPdfFile(content: ManualContent, id: string): Promise<Buffer> {
  return generateManualPdf(content, id)
}
