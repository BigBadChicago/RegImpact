import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AlertCenter } from '@/components/alerts/AlertCenter'

let lastEventSource: MockEventSource | null = null

class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close = vi.fn()

  constructor(_url: string) {
    lastEventSource = this
  }

  emit(data: string) {
    this.onmessage?.({ data } as MessageEvent)
  }
}

global.EventSource = MockEventSource as unknown as typeof EventSource

describe('AlertCenter', () => {
  it('should render bell icon', () => {
    render(<AlertCenter />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should toggle panel on click', () => {
    render(<AlertCenter />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText(/No CRITICAL alerts/i)).toBeInTheDocument()
  })

  it('should show unread count badge', async () => {
    render(<AlertCenter />)
    const button = screen.getByRole('button')
    fireEvent.click(button)

    lastEventSource?.emit(
      JSON.stringify({
        id: 'alert-1',
        type: 'CRITICAL',
        category: 'DEADLINE',
        title: 'Test Alert',
        message: 'Deadline approaching',
        read: false,
        createdAt: new Date().toISOString()
      })
    )
    
    await waitFor(() => {
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('rounded-full')
    })
  })

  it('should filter by alert type', () => {
    render(<AlertCenter />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    const importantTab = screen.getByText(/IMP/i)
    fireEvent.click(importantTab)
    expect(screen.getByText(/No IMPORTANT alerts/i)).toBeInTheDocument()
  })

  it('should show alert tabs', () => {
    render(<AlertCenter />)
    fireEvent.click(screen.getByRole('button'))
    
    expect(screen.getByRole('button', { name: /CRI/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /IMP/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /INF/i })).toBeInTheDocument()
  })
})
