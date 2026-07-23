import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../src/pages/LoginPage'
import * as api from '../src/lib/api'

// ─── mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/api')>()
  return { ...actual, login: vi.fn(), setToken: vi.fn() }
})

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
  localStorage.removeItem('karya_token')
})

// ─── rendering ───────────────────────────────────────────────────────────────

test('renders heading and form fields', () => {
  renderPage()
  expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
})

test('renders link to signup page', () => {
  renderPage()
  const link = screen.getByRole('link', { name: /sign up/i })
  expect(link).toHaveAttribute('href', '/signup')
})

// ─── form validation ─────────────────────────────────────────────────────────

test('sign-in button is disabled when fields are empty', () => {
  renderPage()
  expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
})

test('sign-in button is disabled when only username is filled', () => {
  renderPage()
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'hero' } })
  expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
})

test('sign-in button is disabled when only password is filled', () => {
  renderPage()
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret99' } })
  expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
})

test('sign-in button is enabled when both fields are filled', () => {
  renderPage()
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'hero' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret99' } })
  expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled()
})

// ─── successful login ─────────────────────────────────────────────────────────

test('calls login with trimmed username and password on submit', async () => {
  vi.mocked(api.login).mockResolvedValueOnce({
    access_token: 'tok',
    token_type: 'bearer',
    user: { id: 1, username: 'hero', created_at: '' },
  })
  renderPage()
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: '  hero  ' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret99' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(vi.mocked(api.login)).toHaveBeenCalledWith('hero', 'secret99'))
})

test('shows loading text while submitting', async () => {
  // Never resolves so we can observe the loading state.
  vi.mocked(api.login).mockReturnValueOnce(new Promise(() => {}))
  renderPage()
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'hero' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret99' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  expect(await screen.findByRole('button', { name: /signing in/i })).toBeDisabled()
})

test('navigates to / on successful login', async () => {
  vi.mocked(api.login).mockResolvedValueOnce({
    access_token: 'tok',
    token_type: 'bearer',
    user: { id: 1, username: 'hero', created_at: '' },
  })
  renderPage()
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'hero' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret99' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
})

// ─── failed login ─────────────────────────────────────────────────────────────

test('shows error toast on login failure', async () => {
  const { toast } = await import('sonner')
  vi.mocked(api.login).mockRejectedValueOnce(new Error('Invalid username or password'))
  renderPage()
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'hero' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid username or password'))
  expect(mockNavigate).not.toHaveBeenCalled()
})

test('re-enables button after a failed login', async () => {
  vi.mocked(api.login).mockRejectedValueOnce(new Error('fail'))
  renderPage()
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'hero' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret99' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
  await waitFor(() => expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled())
})
