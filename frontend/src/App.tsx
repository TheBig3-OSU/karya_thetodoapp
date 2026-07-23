import { useEffect, useState } from 'react'
import { fetchHealth, fetchTasks, getToken, type Task } from './lib/api'

type ApiStatus = 'checking' | 'connected' | 'unreachable'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const healthy = await fetchHealth()
      if (cancelled) return
      setApiStatus(healthy ? 'connected' : 'unreachable')
      if (!healthy) return
      if (!getToken()) return   // not logged in yet
      try {
        const data = await fetchTasks()
        if (!cancelled) setTasks(data)
      } catch {
        // Leave tasks empty; the status line already reflects API trouble.
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1>Karya - The Todo App</h1>
      <p>API status: {apiStatus}</p>
      {apiStatus === 'connected' &&
        (tasks.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li key={task.task_id}>
                {task.title}
                {task.is_completed ? ' ✓' : ''}
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}

export default App
