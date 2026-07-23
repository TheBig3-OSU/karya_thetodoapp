import { render, screen } from '@testing-library/react'
import App from '../src/App'

function mockFetch(handler: (url: string) => unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const body = handler(String(input))
      return {
        ok: true,
        status: 200,
        json: async () => body,
      } as Response
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.removeItem('karya_token')
})

test('renders app heading', async () => {
  mockFetch((url) => (url.endsWith('/health') ? { ok: true } : []))
  render(<App />)
  expect(screen.getByText('Karya - The Todo App')).toBeInTheDocument()
  // Wait for the initial load to settle so React doesn't warn about
  // state updates after the test ends.
  await screen.findByText('API status: connected')
})

test('shows connected status and empty state when API is up', async () => {
  mockFetch((url) => (url.endsWith('/health') ? { ok: true } : []))
  render(<App />)
  expect(await screen.findByText('API status: connected')).toBeInTheDocument()
  expect(await screen.findByText('No tasks yet.')).toBeInTheDocument()
})

test('lists tasks returned by the API', async () => {
  localStorage.setItem('karya_token', 'test-token')
  mockFetch((url) =>
    url.endsWith('/health')
      ? { ok: true }
      : [
          {
            task_id: 1,
            title: 'Write the README',
            description: null,
            is_completed: true,
            xp: 10,
          },
        ],
  )
  render(<App />)
  expect(await screen.findByText('Write the README ✓')).toBeInTheDocument()
})

test('reports unreachable API', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('network down')
    }),
  )
  render(<App />)
  expect(await screen.findByText('API status: unreachable')).toBeInTheDocument()
})
