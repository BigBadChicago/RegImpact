import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Generate a professional PDF report of the dashboard
 * Includes cover page, metrics summary, charts (as images), and regulation table
 */
export async function generateDashboardPDF(
  customerId: string,
  companyName: string,
  healthScore: number,
  healthTrend: number,
  totalCostExposure: number,
  costTrend: number,
  regulationCount: number,
  upcomingDeadlines: number
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPosition = margin + 10

  // Set default font
  doc.setFont('Helvetica')

  // ===== PAGE 1: COVER PAGE =====
  const coverBgColor = [31, 41, 55] // bg-gray-800
  doc.setFillColor(coverBgColor[0], coverBgColor[1], coverBgColor[2])
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(32)
  doc.setFont('Helvetica', 'bold')
  doc.text('RegImpact', pageWidth / 2, 60, { align: 'center' })

  doc.setFontSize(28)
  doc.setFont('Helvetica', 'normal')
  doc.text('Executive Compliance Dashboard', pageWidth / 2, 80, { align: 'center' })

  // Company info and date
  doc.setFontSize(14)
  doc.text(companyName, pageWidth / 2, 110, { align: 'center' })

  doc.setFontSize(11)
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  doc.text(`Report Date: ${today}`, pageWidth / 2, 125, { align: 'center' })

  // Health score highlight
  doc.setFontSize(48)
  doc.setTextColor(16, 185, 129) // green
  const scoreColor = healthScore < 60 ? [239, 68, 68] : healthScore < 80 ? [234, 179, 8] : [16, 185, 129]
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2])
  doc.setFont('Helvetica', 'bold')
  doc.text(healthScore.toString(), pageWidth / 2, 160, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(16)
  doc.text('Compliance Health Score', pageWidth / 2, 175, { align: 'center' })

  // Page number
  doc.setFontSize(10)
  doc.setTextColor(156, 163, 175) // gray-400
  doc.text('1', pageWidth - margin - 5, pageHeight - margin, { align: 'right' })

  // ===== PAGE 2: METRICS SUMMARY =====
  doc.addPage()
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(24)
  doc.setFont('Helvetica', 'bold')
  doc.text('Executive Summary', margin, 25)

  yPosition = 40

  // Metrics Grid
  doc.setFontSize(11)
  doc.setFont('Helvetica', 'normal')

  const metrics = [
    {
      label: 'Health Score',
      value: healthScore.toString(),
      unit: '/100',
      trend: healthTrend
    },
    {
      label: 'Cost Exposure',
      value: '$' + (totalCostExposure / 1000000).toFixed(2),
      unit: 'M',
      trend: costTrend
    },
    {
      label: 'Active Regulations',
      value: regulationCount.toString(),
      unit: '',
      trend: 0
    },
    {
      label: 'Upcoming Deadlines',
      value: upcomingDeadlines.toString(),
      unit: '',
      trend: 0
    }
  ]

  const metricsPerRow = 2
  const cellWidth = (pageWidth - margin * 2) / metricsPerRow
  const cellHeight = 45

  metrics.forEach((metric, index) => {
    const row = Math.floor(index / metricsPerRow)
    const col = index % metricsPerRow
    const xPos = margin + col * cellWidth
    const yPos = yPosition + row * cellHeight

    // Cell background
    doc.setFillColor(240, 244, 248) // bg-blue-50
    doc.rect(xPos, yPos, cellWidth - 5, cellHeight, 'F')

    // Border
    doc.setDrawColor(209, 213, 219) // border-gray-300
    doc.rect(xPos, yPos, cellWidth - 5, cellHeight)

    // Label
    doc.setFontSize(9)
    doc.setFont('Helvetica', 'normal')
    doc.setTextColor(107, 114, 128) // text-gray-600
    doc.text(metric.label, xPos + 5, yPos + 8)

    // Value
    doc.setFontSize(18)
    doc.setFont('Helvetica', 'bold')
    doc.setTextColor(17, 24, 39) // text-gray-900
    const valueText = metric.value + metric.unit
    doc.text(valueText, xPos + 5, yPos + 22)

    // Trend
    if (metric.trend !== 0) {
      doc.setFontSize(9)
      const trendColor = metric.trend > 0 ? [16, 185, 129] : [239, 68, 68] // green or red
      doc.setTextColor(trendColor[0], trendColor[1], trendColor[2])
      doc.setFont('Helvetica', 'normal')
      const trendText = `${metric.trend > 0 ? '+' : ''}${metric.trend.toFixed(1)}%`
      doc.text(trendText, xPos + 5, yPos + 35)
    }
  })

  yPosition += metrics.length > 2 ? 90 : 50

  // Summary text
  doc.setFontSize(11)
  doc.setFont('Helvetica', 'normal')
  doc.setTextColor(55, 65, 81) // text-gray-700

  const summaryText = `This compliance dashboard provides an overview of your regulatory exposure, health metrics, and upcoming deadlines. The health score combines deadline adherence, cost predictability, and risk exposure metrics to provide a comprehensive view of your compliance posture.`

  const wrappedText = doc.splitTextToSize(summaryText, pageWidth - margin * 2)
  doc.text(wrappedText, margin, yPosition)

  // Page number
  doc.setFontSize(10)
  doc.setTextColor(156, 163, 175)
  doc.text('2', pageWidth - margin - 5, pageHeight - margin, { align: 'right' })

  // ===== PAGE 3: REGULATIONS TABLE =====
  doc.addPage()

  doc.setFontSize(24)
  doc.setFont('Helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Active Regulations', margin, 25)

  yPosition = 40

  // Table headers
  doc.setFontSize(10)
  doc.setFont('Helvetica', 'bold')
  doc.setFillColor(31, 41, 55) // bg-gray-800
  doc.setTextColor(255, 255, 255)

  const colWidths = [50, 40, 40, 30]
  const headers = ['Regulation', 'Jurisdiction', 'Cost Exposure', 'Risk Level']

  let xPos = margin
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPosition, { maxWidth: colWidths[i] })
    xPos += colWidths[i]
  })

  yPosition += 8

  // Table rows (placeholder)
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(55, 65, 81)
  doc.setFillColor(240, 244, 248) // alternating rows

  for (let i = 0; i < Math.min(regulationCount, 15); i++) {
    if (yPosition > pageHeight - margin - 10) {
      doc.addPage()
      yPosition = margin + 20
    }

    if (i % 2 === 0) {
      doc.setFillColor(240, 244, 248)
      xPos = margin
      doc.rect(xPos, yPosition - 4, pageWidth - margin * 2, 6, 'F')
    }

    // Placeholder row (in real implementation, populate from database)
    doc.text('Regulation ' + (i + 1), margin, yPosition)
    doc.text('Federal', margin + colWidths[0], yPosition)
    doc.text('$50K - $100K', margin + colWidths[0] + colWidths[1], yPosition)
    doc.text('ROUTINE', margin + colWidths[0] + colWidths[1] + colWidths[2], yPosition)

    yPosition += 7
  }

  // Footer
  doc.setFontSize(10)
  doc.setTextColor(156, 163, 175)
  doc.text('3', pageWidth - margin - 5, pageHeight - margin, { align: 'right' })

  // Return PDF as blob
  return doc.output('blob')
}

/**
 * Generate PDF using canvas conversion of DOM elements
 * Useful for converting charts/visualizations to PDF
 */
export async function canvasToPDF(
  canvasElements: HTMLElement[],
  title: string,
  fileName: string
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Use provided title and fileName for PDF metadata
  doc.setProperties({
    title,
    subject: fileName
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10

  let pageCount = 0

  for (const element of canvasElements) {
    if (pageCount > 0) {
      doc.addPage()
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height / canvas.width) * imgWidth

      if (imgHeight > pageHeight - margin * 2) {
        // Scale down if too large
        const scaleFactor = (pageHeight - margin * 2) / imgHeight
        doc.addImage(imgData, 'PNG', margin, margin, imgWidth * scaleFactor, imgHeight * scaleFactor)
      } else {
        doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
      }

      pageCount++
    } catch (error) {
      console.error('Error converting canvas to image:', error)
    }
  }

  return doc.output('blob')
}
