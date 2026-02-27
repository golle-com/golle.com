import { Navigate, Route, Routes } from 'react-router-dom'
import AboutPanel from './features/about/AboutPanel'
import AccountPanel from './features/account/AccountPanel'
import DeviceFlow from './features/auth/DeviceFlow'
import TokenPaste from './features/auth/TokenPaste'
import DownloadsPanel from './features/downloads/DownloadsPanel'
import HostsPanel from './features/hosts/HostsPanel'
import TorrentsPanel from './features/torrents/TorrentsPanel'
import UnrestrictPanel from './features/unrestrict/UnrestrictPanel'
import type { RdError } from './lib/realDebrid'
import { type PlannedView, plannedViews } from './routeMetadata'
import type { AuthTokens } from './lib/storage'

const implementedPaths = new Set(['/auth', '/downloads', '/torrents', '/unrestrict', '/account', '/hosts'])

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

type AppRoutesProps = {
  authTokens: AuthTokens | null
  setAuthTokens: (tokens: AuthTokens | null) => void
  onAuthSuccess: () => void
  onAuthError: (message: string, error?: RdError) => void
  onInfo: (message: string) => void
  onPendingInfo: (message: string, timeoutMs: number) => void
}

function AppRoutes({ authTokens, setAuthTokens, onAuthSuccess, onAuthError, onInfo, onPendingInfo }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          authTokens ? (
            <Navigate to="/downloads" replace />
          ) : (
            <div>
              <TokenPaste
                onTokensSaved={setAuthTokens}
                onAuthSuccess={onAuthSuccess}
                onAuthError={onAuthError}
              />
              <DeviceFlow
                onTokensSaved={setAuthTokens}
                onAuthSuccess={onAuthSuccess}
                onAuthError={onAuthError}
                onInfo={onInfo}
                onPendingInfo={onPendingInfo}
              />
            </div>
          )
        }
      />
      <Route
        path="/downloads"
        element={
          authTokens ? (
            <DownloadsPanel
              accessToken={authTokens?.accessToken ?? null}
              onLoadError={onAuthError}
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
              onLoadError={onAuthError}
              onInfo={onInfo}
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
              onLoadError={onAuthError}
              onInfo={onInfo}
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
              onLoadError={onAuthError}
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
              onLoadError={onAuthError}
            />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
      <Route path="/about" element={<AboutPanel />} />
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
  )
}

export default AppRoutes