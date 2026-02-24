import { useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import DeviceFlow from './features/auth/DeviceFlow'
import TokenPaste from './features/auth/TokenPaste'
import DownloadsPanel from './features/downloads/DownloadsPanel'
import TorrentsPanel from './features/torrents/TorrentsPanel'
import AccountPanel from './features/account/AccountPanel'
import UnrestrictPanel from './features/unrestrict/UnrestrictPanel'
import HostsPanel from './features/hosts/HostsPanel'
import { clearAuthTokens, loadAuthTokens, type AuthTokens } from './lib/storage'

type ThemeOption = {
  id: string
  label: string
  href: string
}

type PlannedView = {
  id: string
  label: string
  path: string
  apiNamespace: string
  description: string
}

const THEME_STORAGE_KEY = 'rd_theme'

const themeOptions: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light (Bootstrap)',
    href: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
  },
  {
    id: 'dark',
    label: 'Dark (Darkly)',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/darkly/bootstrap.min.css',
  },
  {
    id: 'cosmo',
    label: 'Cosmo',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/cosmo/bootstrap.min.css',
  },
  {
    id: 'flatly',
    label: 'Flatly',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/flatly/bootstrap.min.css',
  },
  {
    id: 'litera',
    label: 'Litera',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/litera/bootstrap.min.css',
  },
  {
    id: 'lumen',
    label: 'Lumen',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/lumen/bootstrap.min.css',
  },
  {
    id: 'minty',
    label: 'Minty',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/minty/bootstrap.min.css',
  },
  {
    id: 'pulse',
    label: 'Pulse',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/pulse/bootstrap.min.css',
  },
  {
    id: 'sandstone',
    label: 'Sandstone',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/sandstone/bootstrap.min.css',
  },
  {
    id: 'united',
    label: 'United',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/united/bootstrap.min.css',
  },
  {
    id: 'yeti',
    label: 'Yeti',
    href: 'https://cdn.jsdelivr.net/npm/bootswatch@5.3.8/dist/yeti/bootstrap.min.css',
  },
]

const plannedViews: PlannedView[] = [
  {
    id: 'downloads',
    label: 'Downloads',
    path: '/downloads',
    apiNamespace: '/downloads',
    description: 'List, open, and delete completed downloads.',
  },
  {
    id: 'torrents',
    label: 'Torrents',
    path: '/torrents',
    apiNamespace: '/torrents',
    description: 'Manage torrent list, info, and file selection.',
  },
  {
    id: 'unrestrict',
    label: 'Unrestrict',
    path: '/unrestrict',
    apiNamespace: '/unrestrict',
    description: 'Check and unrestrict links and containers.',
  },
  {
    id: 'streaming',
    label: 'Streaming',
    path: '/streaming',
    apiNamespace: '/streaming',
    description: 'Transcoding links and media info lookup.',
  },
  {
    id: 'hosts',
    label: 'Hosts',
    path: '/hosts',
    apiNamespace: '/hosts',
    description: 'Hoster support, availability status, and regex metadata.',
  },
  {
    id: 'settings',
    label: 'Account',
    path: '/account',
    apiNamespace: '/settings',
    description: 'User settings, points conversion, and avatar.',
  },
]

const navViews = plannedViews.filter((view) => view.id !== 'streaming')

const implementedPaths = new Set(['/auth', '/downloads', '/torrents', '/unrestrict', '/account', '/hosts'])
const AUTH_PENDING_TOAST_ID = 'auth-pending'

function ComingSoon({ label, apiNamespace, description }: PlannedView) {
  return (
    <div className="card">
      <div className="card-header">
        <h5>{label}</h5>
      </div>
      <div className="card-body">
        <p>This view is planned but not wired up yet.</p>
        <div>
          <div>
            <strong>API namespace:</strong> {apiNamespace}
          </div>
          <div>
            <strong>Scope:</strong> {description}
          </div>
        </div>
      </div>
    </div>
  )
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

  const handleAuthError = (message: string) => {
    toast.dismiss(AUTH_PENDING_TOAST_ID)
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

  const handleWarning = (message: string) => {
    toast.warn(message)
  }

  const handleNavClick = () => {
    const nav = document.getElementById('pageNav')
    if (!nav) {
      return
    }
    const bootstrap = (window as { bootstrap?: { Collapse?: { getOrCreateInstance?: (element: Element) => { hide: () => void } } } }).bootstrap
    if (!bootstrap?.Collapse?.getOrCreateInstance) {
      return
    }
    bootstrap.Collapse.getOrCreateInstance(nav).hide()
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
            <div>
              {authTokens ? (
                <div>
                  <button className="btn btn-secondary" type="button" onClick={handleSignOut}>
                    Sign&nbsp;Out
                  </button>
                </div>
              ) : null}
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
            </div>
          </div>
        </nav>

        {authTokens && (
          <nav className="navbar navbar-expand-md bg-light">
            <div className="container-fluid">
              <button
                className="navbar-toggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#pageNav"
                aria-controls="pageNav"
                aria-expanded="false"
                aria-label="Toggle navigation"
              >
                <span className="navbar-toggler-icon"></span>
              </button>
              <div className="collapse navbar-collapse" id="pageNav">
                <div className="navbar-nav">
                  {navViews.map((view) => (
                    <NavLink
                      key={view.id}
                      to={view.path}
                      end
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        `nav-link${isActive ? ' active' : ''}`
                      }
                    >
                      {view.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </nav>
        )}

        <main className="container">
        <Routes>
          <Route
            path="/auth"
            element={
              <div>
                <TokenPaste
                  onTokensSaved={setAuthTokens}
                  onAuthSuccess={handleAuthSuccess}
                  onAuthError={handleAuthError}
                />
                <DeviceFlow
                  onTokensSaved={setAuthTokens}
                  onAuthSuccess={handleAuthSuccess}
                  onAuthError={handleAuthError}
                  onInfo={handleInfo}
                  onPendingInfo={handlePendingInfo}
                />
              </div>
            }
          />
          <Route
            path="/downloads"
            element={
              authTokens ? (
                <DownloadsPanel
                  accessToken={authTokens?.accessToken ?? null}
                  onLoadError={handleAuthError}
                />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/torrents"
            element={
              authTokens ? (
                <TorrentsPanel
                  accessToken={authTokens?.accessToken ?? null}
                  onLoadError={handleAuthError}
                  onInfo={handleInfo}
                />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/unrestrict"
            element={
              authTokens ? (
                <UnrestrictPanel
                  accessToken={authTokens?.accessToken ?? null}
                  onLoadError={handleAuthError}
                  onInfo={handleInfo}
                />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/account"
            element={
              authTokens ? (
                <AccountPanel
                  accessToken={authTokens?.accessToken ?? null}
                  onLoadError={handleAuthError}
                  onLoadWarning={handleWarning}
                />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/hosts"
            element={
              authTokens ? (
                <HostsPanel
                  accessToken={authTokens?.accessToken ?? null}
                  onLoadError={handleAuthError}
                />
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          {plannedViews
            .filter((view) => !implementedPaths.has(view.path))
            .map((view) => (
              <Route
                key={view.id}
                path={view.path}
                element={
                  authTokens ? (
                    <ComingSoon {...view} />
                  ) : (
                    <Navigate to="/auth" replace />
                  )
                }
              />
            ))}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
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
