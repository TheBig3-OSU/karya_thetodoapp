import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SignupPage from '../src/pages/SignupPage'
import * as api from '../src/lib/api'

// ─── mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/api')>()
  return { ...actual, register: vi.fn(), setToken: vi.fn() }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SignupPage />
    </MemoryRouter>,
  )
}

// Helpers to fill individual fields.
function fillUsername(value: string) {
  fireEvent.change(screen.getByLabelText(/^username/i), { target: { value } })
}
function fillPassword(value: string) {
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value } })
}
function fillConfirm(value: string) {
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value } })
}

afterEach(() => {
  vi.clearAllMocks()
  localStorage.removeItem('karya_token')
})

// ─── rendering ───────────────────────────────────────────────────────────────

test('renders heading and all form fields', () => {
  renderPage()
  expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/^username/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
})

test('renders link to login page', () => {
  renderPage()
  const link = screen.getByRole('link', { name: /sign in/i })
  expect(link).toHaveAttribute('href', '/login')
})

// ─── inline validation ───────────────────────────────────────────────────────

test('shows username too-short message when fewer than 3 chars typed', () => {
  renderPage()
  fillUsername('ab')
  expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument()
})

test('hides username message once 3+ chars are typed', () => {
  renderPage()
  fillUsername('ab')
  fillUsername('abc')
  expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument()
})

test('shows password too-short message when fewer than 8 chars typed', () => {
  renderPage()
  fillPassword('short')
  expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
})

test('hides password message once 8+ chars are typed', () => {
  renderPage()
  fillPassword('short')
  fillPassword('longenough')
  expect(screen.queryByText(/at least 8 characters/i)).not.toBeInTheDocument()
})

test('shows mismatch error when confirm differs from password', () => {
  renderPage()
  fillPassword('password1')
  fillConfirm('different')
  expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
})

test('hides mismatch error once confirm matches password', () => {
  renderPage()
  fillPassword('password1')
  fillConfirm('different')
  fillConfirm('password1')
  expect(screen.queryByText(/passwords don't match/i)).not.toBeInTheDocument()
})

// ─── button disabled states ──────────────────────────────────────────────────

test('submit button is disabled when all fields are empty', () => {
  renderPage()
  expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
})

test('submit button is disabled when username is too short', () => {
  renderPage()
  fillUsername('ab')
  fillPassword('password1')
  fillConfirm('password1')
  expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
})

test('submit button is disabled when password is too short', () => {
  renderPage()
  fillUsername('hero')
  fillPassword('short')
  fillConfirm('short')
  expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
})

test('submit button is disabled when passwords do not match', () => {
  renderPage()
  fillUsername('hero')
  fillPassword('password1')
  fillConfirm('password2')
  expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
})

test('submit button is enabled when all fields are valid and matching', () => {
  renderPage()
  fillUsername('hero')
  fillPassword('password1')
  fillConfirm('password1')
  expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled()
})

// ─── successful signup ───────────────────────────────────────────────────────

test('calls register with trimmed username and password on submit', async () => {
  vi.mocked(api.register).mockResolvedValueOnce({
    access_token: 'tok',
    token_type: 'bearer',
    user: { id: 1, username: 'hero', created_at: '' },
  })
  renderPage()
  fillUsername('  hero  ')
  fillPassword('password1')
  fillConfirm('password1')
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  await waitFor(() => expect(vi.mocked(api.register)).toHaveBeenCalledWith('hero', 'password1'))
})

test('shows loading text while submitting', async () => {
  vi.mocked(api.register).mockReturnValueOnce(new Promise(() => {}))
  renderPage()
  fillUsername('hero')
  fillPassword('password1')
  fillConfirm('password1')
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  expect(await screen.findByRole('button', { name: /creating account/i })).toBeDisabled()
})

test('navigates to / on successful registration', async () => {
  vi.mocked(api.register).mockResolvedValueOnce({
    access_token: 'tok',
    token_type: 'bearer',
    user: { id: 1, username: 'hero', created_at: '' },
  })
  renderPage()
  fillUsername('hero')
  fillPassword('password1')
  fillConfirm('password1')
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
})

// ─── failed signup ───────────────────────────────────────────────────────────

test('shows error toast on registration failure', async () => {
  const { toast } = await import('sonner')
  vi.mocked(api.register).mockRejectedValueOnce(new Error('Username already taken'))
  renderPage()
  fillUsername('taken')
  fillPassword('password1')
  fillConfirm('password1')
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Username already taken'))
  expect(mockNavigate).not.toHaveBeenCalled()
})

test('re-enables button after a failed registration', async () => {
  vi.mocked(api.register).mockRejectedValueOnce(new Error('fail'))
  renderPage()
  fillUsername('hero')
  fillPassword('password1')
  fillConfirm('password1')
  fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled(),
  )
})
