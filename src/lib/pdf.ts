// PDF generation helper — uses pure Node.js pdfkit (no Python, no external
// dependencies). Runs in the same Node.js process as the Next.js API route.
import { generateReportPdf, generateManualPdf, ReportPdfData, ManualContent } from '@/lib/pdfkit-generator'

export async function generateReportPdfFile(data: ReportPdfData, id: string): Promise<string> {
  return generateReportPdf(data, id)
}

export async function generateManualPdfFile(content: ManualContent, id: string): Promise<string> {
  return generateManualPdf(content, id)
}
