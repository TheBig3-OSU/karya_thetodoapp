// Base URL of the Karya API. Locally this is the uvicorn dev server;
// on Vercel it comes from the VITE_API_URL environment variable.
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ---------- Token helpers ----------
export const getToken = (): string | null => localStorage.getItem('karya_token')
export const setToken = (t: string): void => { localStorage.setItem('karya_token', t) }
export const clearToken = (): void => { localStorage.removeItem('karya_token') }

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...init.headers },
  })
}

// ---------- Types (mirror backend schemas.py) ----------
export interface User {
  id: number
  username: string
  created_at: string
}

export interface TokenOut {
  access_token: string
  token_type: string
  user: User
}

export interface Team {
  id: number
  name: string
  invite_code: string
  owner_id: number
  created_at: string
}

export interface Task {
  task_id: number
  title: string
  description: string | null
  team_id: number
  user_id: number
  category_id: number | null
  xp: number
  is_completed: boolean
  intermediary_progress: number | null
  requires_vouch: boolean
  vouched_by: number | null
  vouched_at: string | null
  created_at: string
}

export interface TaskActionOut {
  task: Task
  xp_granted: boolean
}

export interface TeamDetail extends Team {
  member_count: number
  total_xp: number
  team_level: number
}

export interface Member {
  user_id: number
  username: string
  role: string
  joined_at: string
  current_xp: number
  level: number
}

export interface MemberPatchBody {
  role?: 'member' | 'admin'
  remove?: boolean
}

export interface Category {
  id: number
  team_id: number
  name: string
}

export interface ReactionSummary {
  emoji: string
  count: number
  reacted_by_me: boolean
}

export interface FeedItem {
  task_id: number
  title: string
  doer_id: number
  doer_username: string
  category_name: string | null
  xp: number
  is_completed: boolean
  intermediary_progress: number | null
  requires_vouch: boolean
  vouched: boolean
  reply_count: number
  reactions: ReactionSummary[]
  created_at: string
}

export interface ThreadPost {
  task_id: number
  user_id: number
  username: string
  posted_at: string
  reply: string
}

export interface Attachment {
  id: number
  task_id: number
  file_url: string
  filename: string
  uploaded_by: number
  uploaded_at: string
}

export interface Reaction {
  task_id: number
  user_id: number
  username: string
  emoji: string
  reacted_at: string
}

export interface UserXp {
  team_id: number
  current_xp: number
  level: number
  level_floor: number
  next_level_at: number
}

export interface UserProfile extends User {
  quests_completed: number
  streak_days: number
}

// ---------- Health ----------
export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

// ---------- Auth  →  /auth ----------
export async function register(username: string, password: string): Promise<TokenOut> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function login(username: string, password: string): Promise<TokenOut> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function getMe(): Promise<User> {
  const res = await authFetch('/auth/me')
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

// ---------- Teams  →  /teams ----------
export async function createTeam(name: string): Promise<Team> {
  const res = await authFetch('/teams', { method: 'POST', body: JSON.stringify({ name }) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function joinTeam(invite_code: string): Promise<Team> {
  const res = await authFetch('/teams/join', { method: 'POST', body: JSON.stringify({ invite_code }) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

// ---------- Tasks  →  /tasks ----------
export interface TaskFilters {
  team_id?: number
  user_id?: number
  completed?: boolean
}

export async function fetchTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const params = new URLSearchParams()
  if (filters.team_id !== undefined) params.set('team_id', String(filters.team_id))
  if (filters.user_id !== undefined) params.set('user_id', String(filters.user_id))
  if (filters.completed !== undefined) params.set('completed', String(filters.completed))
  const query = params.size ? `?${params}` : ''
  const res = await authFetch(`/tasks${query}`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export interface TaskCreateBody {
  title: string
  team_id: number
  description?: string
  category_id?: number
  xp?: number
  intermediary_progress?: number
  requires_vouch?: boolean
}

export async function createTask(body: TaskCreateBody): Promise<Task> {
  const res = await authFetch('/tasks', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function getTask(task_id: number): Promise<Task> {
  const res = await authFetch(`/tasks/${task_id}`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export interface TaskUpdateBody {
  title?: string
  description?: string
  category_id?: number
  xp?: number
  intermediary_progress?: number
  requires_vouch?: boolean
}

export async function updateTask(task_id: number, body: TaskUpdateBody): Promise<Task> {
  const res = await authFetch(`/tasks/${task_id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function completeTask(task_id: number): Promise<TaskActionOut> {
  const res = await authFetch(`/tasks/${task_id}/complete`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function vouchTask(task_id: number): Promise<TaskActionOut> {
  const res = await authFetch(`/tasks/${task_id}/vouch`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function deleteTask(task_id: number): Promise<void> {
  const res = await authFetch(`/tasks/${task_id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
}

// ---------- Users  →  /users ----------
export async function getProfile(user_id: number): Promise<UserProfile> {
  const res = await authFetch(`/users/${user_id}`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function updateProfile(user_id: number, body: { username?: string; password?: string }): Promise<User> {
  const res = await authFetch(`/users/${user_id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function getUserXp(user_id: number, team_id: number): Promise<UserXp> {
  const res = await authFetch(`/users/${user_id}/xp?team_id=${team_id}`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

// ---------- Teams (extended)  →  /teams ----------
export async function getTeam(team_id: number): Promise<TeamDetail> {
  const res = await authFetch(`/teams/${team_id}`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function listMembers(team_id: number): Promise<Member[]> {
  const res = await authFetch(`/teams/${team_id}/members`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function patchMember(team_id: number, user_id: number, body: MemberPatchBody): Promise<Member[] | { removed: number }> {
  const res = await authFetch(`/teams/${team_id}/members/${user_id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function listCategories(team_id: number): Promise<Category[]> {
  const res = await authFetch(`/teams/${team_id}/categories`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function createCategory(team_id: number, name: string): Promise<Category> {
  const res = await authFetch(`/teams/${team_id}/categories`, { method: 'POST', body: JSON.stringify({ name }) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function getTeamFeed(team_id: number, limit = 50): Promise<FeedItem[]> {
  const res = await authFetch(`/teams/${team_id}/feed?limit=${limit}`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

// ---------- Threads  →  /tasks/{id}/thread ----------
export async function getThread(task_id: number): Promise<ThreadPost[]> {
  const res = await authFetch(`/tasks/${task_id}/thread`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function postReply(task_id: number, reply: string): Promise<ThreadPost> {
  const res = await authFetch(`/tasks/${task_id}/thread`, { method: 'POST', body: JSON.stringify({ reply }) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

// ---------- Attachments  →  /tasks/{id}/attachments ----------
export async function listAttachments(task_id: number): Promise<Attachment[]> {
  const res = await authFetch(`/tasks/${task_id}/attachments`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function addAttachment(task_id: number, body: { file_url: string; filename: string }): Promise<Attachment> {
  const res = await authFetch(`/tasks/${task_id}/attachments`, { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function deleteAttachment(task_id: number, attachment_id: number): Promise<void> {
  const res = await authFetch(`/tasks/${task_id}/attachments/${attachment_id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
}

// ---------- Reactions  →  /tasks/{id}/reactions ----------
export async function listReactions(task_id: number): Promise<Reaction[]> {
  const res = await authFetch(`/tasks/${task_id}/reactions`)
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function addReaction(task_id: number, emoji: string): Promise<Reaction> {
  const res = await authFetch(`/tasks/${task_id}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
  return res.json()
}

export async function removeReaction(task_id: number, emoji: string): Promise<void> {
  const res = await authFetch(`/tasks/${task_id}/reactions/${encodeURIComponent(emoji)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
}

