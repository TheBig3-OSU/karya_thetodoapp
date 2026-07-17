// Base URL of the Karya API. Locally this is the uvicorn dev server;
// on Vercel it comes from the VITE_API_URL environment variable.
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface Task {
  task_id: number
  title: string
  description: string | null
  is_completed: boolean
  xp: number
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_URL}/api/tasks`)
  if (!res.ok) {
    throw new Error(`Failed to fetch tasks: ${res.status}`)
  }
  return res.json()
}
