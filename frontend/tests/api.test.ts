/**
 * Tests for frontend/src/lib/api.ts
 *
 * Covers every new function added, the type fix for getProfile,
 * token helpers, auth-header injection, and error-throwing behaviour.
 */
import {
  // Token helpers
  getToken, setToken, clearToken,
  // Health
  fetchHealth,
  // Auth
  register, login, getMe,
  // Teams
  createTeam, joinTeam,
  getTeam, listMembers, patchMember,
  listCategories, createCategory, getTeamFeed,
  // Tasks
  fetchTasks, createTask, getTask,
  completeTask, vouchTask, deleteTask,
  // Threads
  getThread, postReply,
  // Attachments
  listAttachments, addAttachment, deleteAttachment,
  // Reactions
  listReactions, addReaction, removeReaction,
  // Users
  getProfile, updateProfile, getUserXp,
} from '../src/lib/api'

const BASE = 'http://localhost:8000'

// ─── helpers ────────────────────────────────────────────────────────────────

function okFetch(body: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status,
      json: async () => body,
    } as Response)),
  )
}

function failFetch(detail = 'Not found', status = 404) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: false,
      status,
      statusText: 'Not Found',
      json: async () => ({ detail }),
    } as Response)),
  )
}

function lastCall(): { url: string; init: RequestInit } {
  const mock = vi.mocked(fetch)
  const [url, init = {}] = mock.mock.lastCall as [string, RequestInit?]
  return { url, init }
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.removeItem('karya_token')
})

// ─── token helpers ───────────────────────────────────────────────────────────

describe('token helpers', () => {
  test('setToken / getToken round-trip', () => {
    setToken('abc')
    expect(getToken()).toBe('abc')
  })

  test('clearToken removes the token', () => {
    setToken('abc')
    clearToken()
    expect(getToken()).toBeNull()
  })
})

// ─── fetchHealth ─────────────────────────────────────────────────────────────

describe('fetchHealth', () => {
  test('returns true when API responds ok', async () => {
    okFetch({ ok: true })
    expect(await fetchHealth()).toBe(true)
  })

  test('returns false on network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
    expect(await fetchHealth()).toBe(false)
  })
})

// ─── auth ────────────────────────────────────────────────────────────────────

describe('register', () => {
  test('POST /auth/register with credentials', async () => {
    const token = { access_token: 'tok', token_type: 'bearer', user: { id: 1, username: 'u', created_at: '' } }
    okFetch(token, 201)
    const result = await register('user', 'password1')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/auth/register`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ username: 'user', password: 'password1' })
    expect(result.access_token).toBe('tok')
  })

  test('throws on non-ok response', async () => {
    failFetch('Username already taken', 409)
    await expect(register('u', 'pass1234')).rejects.toThrow('Username already taken')
  })
})

describe('login', () => {
  test('POST /auth/login', async () => {
    okFetch({ access_token: 'tok', token_type: 'bearer', user: {} })
    await login('user', 'pass')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/auth/login`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ username: 'user', password: 'pass' })
  })

  test('throws on invalid credentials', async () => {
    failFetch('Invalid username or password', 401)
    await expect(login('u', 'bad')).rejects.toThrow('Invalid username or password')
  })
})

describe('getMe', () => {
  test('GET /auth/me with auth header', async () => {
    setToken('my-token')
    okFetch({ id: 1, username: 'u', created_at: '' })
    await getMe()
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/auth/me`)
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token')
  })
})

// ─── teams ───────────────────────────────────────────────────────────────────

describe('createTeam', () => {
  test('POST /teams with name', async () => {
    okFetch({ id: 1, name: 'Warriors', invite_code: 'ABC', owner_id: 1, created_at: '' }, 201)
    setToken('t')
    await createTeam('Warriors')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/teams`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Warriors' })
  })
})

describe('joinTeam', () => {
  test('POST /teams/join with invite_code', async () => {
    okFetch({ id: 2, name: 'Knights', invite_code: 'XYZ', owner_id: 5, created_at: '' })
    setToken('t')
    await joinTeam('XYZ')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/teams/join`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ invite_code: 'XYZ' })
  })
})

describe('getTeam', () => {
  test('GET /teams/{id}', async () => {
    okFetch({ id: 3, name: 'T', invite_code: 'C', owner_id: 1, created_at: '', member_count: 2, total_xp: 50, team_level: 1 })
    setToken('t')
    const team = await getTeam(3)
    const { url } = lastCall()
    expect(url).toBe(`${BASE}/teams/3`)
    expect(team.member_count).toBe(2)
    expect(team.total_xp).toBe(50)
    expect(team.team_level).toBe(1)
  })
})

describe('listMembers', () => {
  test('GET /teams/{id}/members', async () => {
    okFetch([{ user_id: 1, username: 'u', role: 'admin', joined_at: '', current_xp: 10, level: 1 }])
    setToken('t')
    const members = await listMembers(3)
    expect(lastCall().url).toBe(`${BASE}/teams/3/members`)
    expect(members[0].role).toBe('admin')
  })
})

describe('patchMember', () => {
  test('PATCH /teams/{id}/members/{uid} to change role', async () => {
    okFetch([])
    setToken('t')
    await patchMember(3, 7, { role: 'admin' })
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/teams/3/members/7`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ role: 'admin' })
  })

  test('PATCH /teams/{id}/members/{uid} to remove', async () => {
    okFetch({ removed: 7 })
    setToken('t')
    const result = await patchMember(3, 7, { remove: true })
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ remove: true })
    expect(result).toEqual({ removed: 7 })
  })
})

describe('listCategories', () => {
  test('GET /teams/{id}/categories', async () => {
    okFetch([{ id: 1, team_id: 3, name: 'Chores' }])
    setToken('t')
    const cats = await listCategories(3)
    expect(lastCall().url).toBe(`${BASE}/teams/3/categories`)
    expect(cats[0].name).toBe('Chores')
  })
})

describe('createCategory', () => {
  test('POST /teams/{id}/categories', async () => {
    okFetch({ id: 2, team_id: 3, name: 'Work' }, 201)
    setToken('t')
    const cat = await createCategory(3, 'Work')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/teams/3/categories`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Work' })
    expect(cat.name).toBe('Work')
  })
})

describe('getTeamFeed', () => {
  test('GET /teams/{id}/feed with default limit', async () => {
    okFetch([])
    setToken('t')
    await getTeamFeed(3)
    expect(lastCall().url).toBe(`${BASE}/teams/3/feed?limit=50`)
  })

  test('GET /teams/{id}/feed with custom limit', async () => {
    okFetch([])
    setToken('t')
    await getTeamFeed(3, 10)
    expect(lastCall().url).toBe(`${BASE}/teams/3/feed?limit=10`)
  })
})

// ─── tasks ───────────────────────────────────────────────────────────────────

describe('fetchTasks', () => {
  test('GET /tasks with no filters', async () => {
    okFetch([])
    setToken('t')
    await fetchTasks()
    expect(lastCall().url).toBe(`${BASE}/tasks`)
  })

  test('GET /tasks with team_id and completed filters', async () => {
    okFetch([])
    setToken('t')
    await fetchTasks({ team_id: 2, completed: false })
    expect(lastCall().url).toBe(`${BASE}/tasks?team_id=2&completed=false`)
  })
})

describe('createTask', () => {
  test('POST /tasks', async () => {
    const task = { task_id: 1, title: 'Quest', description: null, team_id: 2, user_id: 1, category_id: null, xp: 5, is_completed: false, intermediary_progress: null, requires_vouch: false, vouched_by: null, vouched_at: null, created_at: '' }
    okFetch(task, 201)
    setToken('t')
    await createTask({ title: 'Quest', team_id: 2, xp: 5 })
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/tasks`)
    expect(init.method).toBe('POST')
  })
})

describe('completeTask', () => {
  test('POST /tasks/{id}/complete', async () => {
    okFetch({ task: {}, xp_granted: true })
    setToken('t')
    const result = await completeTask(42)
    expect(lastCall().url).toBe(`${BASE}/tasks/42/complete`)
    expect(lastCall().init.method).toBe('POST')
    expect(result.xp_granted).toBe(true)
  })
})

describe('vouchTask', () => {
  test('POST /tasks/{id}/vouch', async () => {
    okFetch({ task: {}, xp_granted: false })
    setToken('t')
    await vouchTask(42)
    expect(lastCall().url).toBe(`${BASE}/tasks/42/vouch`)
    expect(lastCall().init.method).toBe('POST')
  })
})

describe('deleteTask', () => {
  test('DELETE /tasks/{id}', async () => {
    okFetch(null, 204)
    setToken('t')
    await deleteTask(99)
    expect(lastCall().url).toBe(`${BASE}/tasks/99`)
    expect(lastCall().init.method).toBe('DELETE')
  })
})

// ─── threads ─────────────────────────────────────────────────────────────────

describe('getThread', () => {
  test('GET /tasks/{id}/thread', async () => {
    okFetch([{ task_id: 1, user_id: 2, username: 'u', posted_at: '', reply: 'hi' }])
    setToken('t')
    const posts = await getThread(1)
    expect(lastCall().url).toBe(`${BASE}/tasks/1/thread`)
    expect(posts[0].reply).toBe('hi')
  })
})

describe('postReply', () => {
  test('POST /tasks/{id}/thread', async () => {
    okFetch({ task_id: 1, user_id: 2, username: 'u', posted_at: '', reply: 'great job' }, 201)
    setToken('t')
    const post = await postReply(1, 'great job')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/tasks/1/thread`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ reply: 'great job' })
    expect(post.reply).toBe('great job')
  })
})

// ─── attachments ─────────────────────────────────────────────────────────────

describe('listAttachments', () => {
  test('GET /tasks/{id}/attachments', async () => {
    okFetch([{ id: 1, task_id: 5, file_url: 'https://x.com/f', filename: 'f.png', uploaded_by: 1, uploaded_at: '' }])
    setToken('t')
    const items = await listAttachments(5)
    expect(lastCall().url).toBe(`${BASE}/tasks/5/attachments`)
    expect(items[0].filename).toBe('f.png')
  })
})

describe('addAttachment', () => {
  test('POST /tasks/{id}/attachments', async () => {
    okFetch({ id: 2, task_id: 5, file_url: 'https://x.com/g', filename: 'g.pdf', uploaded_by: 1, uploaded_at: '' }, 201)
    setToken('t')
    await addAttachment(5, { file_url: 'https://x.com/g', filename: 'g.pdf' })
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/tasks/5/attachments`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ file_url: 'https://x.com/g', filename: 'g.pdf' })
  })
})

describe('deleteAttachment', () => {
  test('DELETE /tasks/{id}/attachments/{aid}', async () => {
    okFetch(null, 204)
    setToken('t')
    await deleteAttachment(5, 2)
    expect(lastCall().url).toBe(`${BASE}/tasks/5/attachments/2`)
    expect(lastCall().init.method).toBe('DELETE')
  })
})

// ─── reactions ───────────────────────────────────────────────────────────────

describe('listReactions', () => {
  test('GET /tasks/{id}/reactions', async () => {
    okFetch([{ task_id: 1, user_id: 2, username: 'u', emoji: '🔥', reacted_at: '' }])
    setToken('t')
    const reactions = await listReactions(1)
    expect(lastCall().url).toBe(`${BASE}/tasks/1/reactions`)
    expect(reactions[0].emoji).toBe('🔥')
  })
})

describe('addReaction', () => {
  test('POST /tasks/{id}/reactions', async () => {
    okFetch({ task_id: 1, user_id: 2, username: 'u', emoji: '👍', reacted_at: '' }, 201)
    setToken('t')
    const reaction = await addReaction(1, '👍')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/tasks/1/reactions`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ emoji: '👍' })
    expect(reaction.emoji).toBe('👍')
  })
})

describe('removeReaction', () => {
  test('DELETE /tasks/{id}/reactions/{emoji} — emoji is URL-encoded', async () => {
    okFetch(null, 204)
    setToken('t')
    await removeReaction(1, '🔥')
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/tasks/1/reactions/${encodeURIComponent('🔥')}`)
    expect(init.method).toBe('DELETE')
  })
})

// ─── users ───────────────────────────────────────────────────────────────────

describe('getProfile', () => {
  test('GET /users/{id} returns UserProfile with quests_completed and streak_days', async () => {
    okFetch({ id: 1, username: 'hero', created_at: '', quests_completed: 7, streak_days: 3 })
    setToken('t')
    const profile = await getProfile(1)
    expect(lastCall().url).toBe(`${BASE}/users/1`)
    expect(profile.quests_completed).toBe(7)
    expect(profile.streak_days).toBe(3)
  })
})

describe('updateProfile', () => {
  test('PATCH /users/{id}', async () => {
    okFetch({ id: 1, username: 'new_name', created_at: '' })
    setToken('t')
    const user = await updateProfile(1, { username: 'new_name' })
    const { url, init } = lastCall()
    expect(url).toBe(`${BASE}/users/1`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ username: 'new_name' })
    expect(user.username).toBe('new_name')
  })

  test('throws on conflict (username taken)', async () => {
    failFetch('Username already taken', 409)
    setToken('t')
    await expect(updateProfile(1, { username: 'taken' })).rejects.toThrow('Username already taken')
  })
})

describe('getUserXp', () => {
  test('GET /users/{id}/xp?team_id=...', async () => {
    okFetch({ team_id: 2, current_xp: 120, level: 3, level_floor: 100, next_level_at: 200 })
    setToken('t')
    const xp = await getUserXp(1, 2)
    expect(lastCall().url).toBe(`${BASE}/users/1/xp?team_id=2`)
    expect(xp.current_xp).toBe(120)
    expect(xp.level).toBe(3)
    expect(xp.level_floor).toBe(100)
    expect(xp.next_level_at).toBe(200)
  })
})

// ─── auth header ─────────────────────────────────────────────────────────────

describe('auth header', () => {
  test('sends Bearer token when token is set', async () => {
    setToken('secret')
    okFetch([])
    await fetchTasks()
    const headers = lastCall().init.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer secret')
  })

  test('omits Authorization header when no token', async () => {
    okFetch([])
    await fetchTasks()
    const headers = lastCall().init.headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })
})

// ─── generic error handling ──────────────────────────────────────────────────

describe('error handling', () => {
  test('throws the detail message from the API', async () => {
    failFetch('Quest not found', 404)
    setToken('t')
    await expect(getTask(999)).rejects.toThrow('Quest not found')
  })

  test('falls back to statusText when detail is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    } as Response)))
    setToken('t')
    await expect(getTask(1)).rejects.toThrow('Internal Server Error')
  })
})
