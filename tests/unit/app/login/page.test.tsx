import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/dom'
import LoginPage from '@/app/login/page'

const mockSignIn = vi.fn()

vi.mock('next-auth/react', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn: (...args: any[]) => mockSignIn(...args),
}))

/**
 * Tests for LoginPage component
 * Covers rendering, form submission, error handling, and loading states
 */

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render email and password inputs', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<LoginPage />)

    expect(
      screen.getByRole('button', { name: 'Sign in' })
    ).toBeInTheDocument()
  })

  it('should call signIn with credentials on submit', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ ok: true })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      })
    })
  })

  it('should show error message on invalid credentials', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ ok: false, error: 'Invalid credentials' })

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email address'), 'bad@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpass')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent('Invalid credentials')
  })

  it('should show fallback error message on signIn error', async () => {
    const user = userEvent.setup()
    mockSignIn.mockRejectedValue(new Error('Network error'))

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByRole('alert')
    ).toHaveTextContent('Unable to sign in right now. Please try again.')
  })

  it('should disable inputs while loading', async () => {
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolvePromise: (value: any) => void

    mockSignIn.mockImplementation(
      () => new Promise((resolve) => {
        resolvePromise = resolve
      })
    )

    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email address'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Assert loading state: inputs disabled, button shows "Signing in..."
    expect(screen.getByLabelText('Email address')).toBeDisabled()
    expect(screen.getByLabelText('Password')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Signing in...' })
    ).toBeDisabled()

    // Resolve the promise to complete sign-in
    resolvePromise!({ ok: true })

    // Assert loading state is cleared: inputs re-enabled, button returns to normal
    await screen.findByRole('button', { name: 'Sign in' })
    expect(screen.getByLabelText('Email address')).not.toBeDisabled()
    expect(screen.getByLabelText('Password')).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled()
  })
})
