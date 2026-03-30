const TOKEN_KEY = "wt_token"
const USER_KEY = "wt_user"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getUser(): { user_id: string; username: string } | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function setUser(user: { user_id: string; username: string }) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
