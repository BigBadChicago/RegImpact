import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ComplianceHealthScore, CostWaterfallData, TimelineRegulation } from '@/types/dashboard-enhanced'
import { formatCurrency, getScoreColor } from './pdf-formatting'

/**
 * Render the cover page with executive summary
 */
function renderCoverPage(
  pdf: jsPDF,
  pageWidth: number,
  healthScore: ComplianceHealthScore,
  waterfall: CostWaterfallData,
  regulations: TimelineRegulation[]
): void {
  // Title
  pdf.setFontSize(24)
  pdf.text('Compliance Board Report', pageWidth / 2, 30, { align: 'center' })
  pdf.setFontSize(12)
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 40, { align: 'center' })
  
  // Health Score
  pdf.setFontSize(16)
  pdf.text('Compliance Health Score', 20, 60)
  pdf.setFontSize(48)
  const color = getScoreColor(healthScore.score)
  pdf.setTextColor(color[0], color[1], color[2])
  pdf.text(String(healthScore.score), pageWidth / 2, 80, { align: 'center' })
  pdf.setTextColor(0, 0, 0)
  
  pdf.setFontSize(10)
  pdf.text('out of 100', pageWidth / 2, 90, { align: 'center' })
  
  // Key Metrics
  pdf.setFontSize(12)
  pdf.text('Key Metrics', 20, 110)
  pdf.setFontSize(10)
  pdf.text(`Total Exposure: ${formatCurrency(waterfall.starting)}`, 20, 120)
  pdf.text(`Critical Deadlines: ${regulations.filter(r => r.riskLevel === 'CRITICAL').length}`, 20, 130)
  pdf.text(`Regulations Tracked: ${regulations.length}`, 20, 140)
  
  // Component Breakdown
  pdf.setFontSize(12)
  pdf.text('Score Components', 20, 160)
  pdf.setFontSize(10)
  pdf.text(`Deadline Adherence: ${Math.round(healthScore.components.deadlineAdherence)}`, 20, 170)
  pdf.text(`Cost Predictability: ${Math.round(healthScore.components.costPredictability)}`, 20, 180)
  pdf.text(`Risk Exposure: ${Math.round(healthScore.components.riskExposureInverse)}`, 20, 190)
}

/**
 * Render the critical deadlines page
 */
function renderCriticalDeadlinesPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  regulations: TimelineRegulation[]
): void {
  pdf.addPage()
  pdf.setFontSize(16)
  pdf.text('Upcoming Critical Deadlines', 20, 20)
  
  const criticalRegulations = regulations
    .filter(r => r.riskLevel === 'CRITICAL')
    .slice(0, 10)
  
  let yPos = 35
  pdf.setFontSize(10)
  
  criticalRegulations.forEach((reg, index) => {
    if (yPos > pageHeight - 20) {
      pdf.addPage()
      yPos = 20
    }
    
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${index + 1}. ${reg.title.substring(0, 60)}${reg.title.length > 60 ? '...' : ''}`, 20, yPos)
    pdf.setFont('helvetica', 'normal')
    yPos += 7
    
    pdf.text(`   Deadline: ${new Date(reg.deadline).toLocaleDateString()}`, 20, yPos)
    yPos += 5
    pdf.text(`   Estimated Cost: ${formatCurrency(reg.cost)}`, 20, yPos)
    yPos += 5
    pdf.text(`   Jurisdiction: ${reg.jurisdiction}`, 20, yPos)
    yPos += 10
  })
}

/**
 * Render the cost breakdown page
 */
function renderCostBreakdownPage(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  waterfall: CostWaterfallData
): void {
  pdf.addPage()
  pdf.setFontSize(16)
  pdf.text('Cost Exposure Breakdown', 20, 20)
  pdf.setFontSize(12)
  pdf.text(`Current Total: ${formatCurrency(waterfall.starting)}`, 20, 35)
  
  pdf.setFontSize(10)
  pdf.text('Recent Additions:', 20, 50)
  
  let yPos = 60
  waterfall.additions.forEach((item, index) => {
    if (yPos > pageHeight - 20) {
      pdf.addPage()
      yPos = 20
    }
    pdf.text(`${index + 1}. ${item.name}: ${formatCurrency(item.value)}`, 25, yPos)
    yPos += 7
  })
}

/**
 * Render footer on the current page
 */
function renderFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
  pdf.setFontSize(8)
  pdf.setTextColor(128, 128, 128)
  pdf.text('Confidential - For Board Use Only', pageWidth / 2, pageHeight - 10, { align: 'center' })
  pdf.setTextColor(0, 0, 0)
}

/**
 * Generate a complete board PDF report
 */
export async function generateBoardPDF(
  healthScore: ComplianceHealthScore,
  waterfall: CostWaterfallData,
  regulations: TimelineRegulation[]
): Promise<Blob> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  renderCoverPage(pdf, pageWidth, healthScore, waterfall, regulations)
  renderCriticalDeadlinesPage(pdf, pageWidth, pageHeight, regulations)
  renderCostBreakdownPage(pdf, pageWidth, pageHeight, waterfall)
  renderFooter(pdf, pageWidth, pageHeight)
  
  return pdf.output('blob')
}

export async function captureChartAsImage(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId)
  if (!element) return null
  
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff'
    })
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error capturing chart:', error)
    return null
  }
}
