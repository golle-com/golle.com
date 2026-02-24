export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  clientId?: string
  clientSecret?: string
}

const AUTH_STORAGE_KEY = 'rd_auth'

export function loadAuthTokens(): AuthTokens | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthTokens
  } catch {
    return null
  }
}

export function saveAuthTokens(tokens: AuthTokens) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens))
}

export function clearAuthTokens() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
