import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import SideNavbar from './features/navigation/SideNavbar'
import { themeOptions } from './features/navigation/themeOptions'
import { navViews } from './routeMetadata'
import AppRoutes from './routes'
import type { RdError } from './lib/realDebrid'
import { clearAuthTokens, loadAuthTokens, type AuthTokens } from './lib/storage'

const THEME_STORAGE_KEY = 'rd_theme'
const AUTH_PENDING_TOAST_ID = 'auth-pending'

function isBadTokenError(error?: RdError) {
  return error?.error === 'bad_token'
}

function App() {
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) ?? 'light'
    } catch {
      return 'light'
    }
  })
  const [authTokens, setAuthTokens] = useState<AuthTokens | null>(() => loadAuthTokens())
  const navigate = useNavigate()

  const activeTheme = useMemo(
    () => themeOptions.find((theme) => theme.id === selectedThemeId) ?? themeOptions[0],
    [selectedThemeId],
  )

  // Reload token from storage on mount and when storage changes
  useEffect(() => {
    const handleStorage = () => {
      setAuthTokens(loadAuthTokens())
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    const link = document.getElementById('bootstrap-theme') as HTMLLinkElement | null
    if (link) {
      link.href = activeTheme.href
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, activeTheme.id)
    document.documentElement.dataset.bsTheme = activeTheme.id === 'dark' ? 'dark' : 'light'
  }, [activeTheme])

  const handleSignOut = () => {
    clearAuthTokens()
    setAuthTokens(null)
    void navigate('/auth')
  }

  const handleAuthSuccess = () => {
    toast.dismiss(AUTH_PENDING_TOAST_ID)
    setAuthTokens(loadAuthTokens())
    void navigate('/downloads')
  }

  const handleAuthError = (message: string, error?: RdError) => {
    toast.dismiss(AUTH_PENDING_TOAST_ID)
    if (isBadTokenError(error)) {
      clearAuthTokens()
      setAuthTokens(null)
      void navigate('/auth')
      toast.error('Session expired. Please sign in again.')
      return
    }
    toast.error(message)
  }

  const handleInfo = (message: string) => {
    toast.success(message)
  }

  const handlePendingInfo = (message: string, timeoutMs: number) => {
    if (toast.isActive(AUTH_PENDING_TOAST_ID)) {
      toast.update(AUTH_PENDING_TOAST_ID, {
        render: message,
        autoClose: timeoutMs,
        type: 'info',
      })
      return
    }

    toast.info(message, {
      autoClose: timeoutMs,
      toastId: AUTH_PENDING_TOAST_ID,
    })
  }

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <>
      <div>
        <nav className="navbar navbar-expand-lg bg-primary">
          <div className="container-fluid">
            <a className="navbar-brand" href="#">
              <img src="/favicon.ico" alt="" width="24" height="24" />
              RD Mobile
            </a>
            <div className="navbar-nav">
              <div className="btn-group" role="group" aria-label="Theme and sign out actions">
                <select
                  className="form-select"
                  aria-label="Select theme"
                  value={activeTheme.id}
                  onChange={(event) => setSelectedThemeId(event.target.value)}
                >
                  {themeOptions.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
                {authTokens ? (
                  <button className="btn btn-secondary" type="button" onClick={handleSignOut}>
                    Sign&nbsp;Out
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </nav>

        <SideNavbar authTokens={Boolean(authTokens)} views={navViews} />

        <main className="container-fluid">
          <AppRoutes
            authTokens={authTokens}
            setAuthTokens={setAuthTokens}
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
            onInfo={handleInfo}
            onPendingInfo={handlePendingInfo}
          />
        </main>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleScrollToTop}
        aria-label="Scroll to top"
      >
        <i className="bi bi-chevron-up"></i>
        <span className="visually-hidden">Scroll to top</span>
      </button>
      <ToastContainer position="top-center" theme="colored" hideProgressBar={false} />
    </>
  )
}

export default App
