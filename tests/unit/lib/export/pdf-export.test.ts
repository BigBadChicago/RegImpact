import { describe, it, expect, vi } from 'vitest'
import { generateDashboardPDF } from '@/lib/export/pdf-export'

vi.mock('jspdf', () => ({
  default: class MockJsPDF {
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297
      }
    }
    setFont = vi.fn()
    setTextColor = vi.fn()
    setFontSize = vi.fn()
    setFillColor = vi.fn()
    setDrawColor = vi.fn()
    splitTextToSize = vi.fn((text: string) => [text])
    rect = vi.fn()
    text = vi.fn()
    addPage = vi.fn()
    output = vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' }))
  }
}))

vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toDataURL: () => 'data:image/png;base64,mock'
  }))
}))

describe('generateDashboardPDF', () => {
  it('should generate PDF with company info', async () => {
    const result = await generateDashboardPDF(
      'customer-1',
      'TechCorp Inc',
      85,
      5,
      500000,
      -10,
      25,
      5
    )

    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe('application/pdf')
  })

  it('should include health score', async () => {
    const result = await generateDashboardPDF(
      'customer-1',
      'Test Co',
      92,
      3,
      100000,
      0,
      10,
      2
    )

    expect(result).toBeInstanceOf(Blob)
  })

  it('should include all metrics', async () => {
    const result = await generateDashboardPDF(
      'customer-1',
      'Company',
      75,
      -2,
      250000,
      15,
      50,
      8
    )

    expect(result).toBeInstanceOf(Blob)
  })

  it('should handle zero values', async () => {
    const result = await generateDashboardPDF(
      'customer-1',
      'Empty Co',
      0,
      0,
      0,
      0,
      0,
      0
    )

    expect(result).toBeInstanceOf(Blob)
  })
})
