import { render, screen } from '@testing-library/react'
import App from '../src/App'

test('renders hello world heading', () => {
  render(<App />)
  expect(screen.getByText('Hello, World!')).toBeInTheDocument()
})

test('renders welcome message', () => {
  render(<App />)
  expect(screen.getByText('Welcome to Karya - The Todo App')).toBeInTheDocument()
})
