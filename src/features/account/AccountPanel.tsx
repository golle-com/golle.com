import { useCallback, useEffect, useRef, useState } from 'react'
import { getSettings, getUserInfo, type RdError, type Settings, type UserInfo } from '../../lib/realDebrid'

type AccountPanelProps = {
  accessToken: string | null
  onLoadError?: (message: string) => void
  onLoadWarning?: (message: string) => void
}

export default function AccountPanel({ accessToken, onLoadError, onLoadWarning }: AccountPanelProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsUnavailable, setSettingsUnavailable] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isSettingsUnavailableError = (error: RdError) =>
    error.status === 403 && (error.error === 'not_allowed_method' || error.error_code === 4)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setUserInfo(null)
      setSettings(null)
      setSettingsUnavailable(false)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const user = await getUserInfo(accessToken)
      setUserInfo(user)

      try {
        const userSettings = await getSettings(accessToken)
        setSettings(userSettings)
        setSettingsUnavailable(false)
      } catch (settingsError) {
        const rdSettingsError = settingsError as RdError
        if (isSettingsUnavailableError(rdSettingsError)) {
          setSettings(null)
          setSettingsUnavailable(true)
          onLoadWarning?.('Settings are currently unavailable.')
        } else {
          throw settingsError
        }
      }
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to load account information.'
      setErrorMessage(message)
      onLoadError?.(message)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, onLoadError, onLoadWarning])

  // Only fetch account data when accessToken changes or component mounts, not on every render
  const lastTokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (accessToken && lastTokenRef.current !== accessToken) {
      lastTokenRef.current = accessToken
      void fetchData()
    } else if (!accessToken) {
      setUserInfo(null)
      setSettings(null)
      setSettingsUnavailable(false)
      lastTokenRef.current = null
    }
  }, [accessToken, fetchData])

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="alert alert-danger" role="alert">
        {errorMessage}
      </div>
    )
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-body">
        <h5 className="mb-0">Account Information</h5>
      </div>
      <div className="card-body">
        {userInfo && (
          <div className="mb-3">
            <h6>User Info</h6>
            <dl className="row">
              <dt className="col-sm-3">ID</dt>
              <dd className="col-sm-9">{userInfo.id}</dd>
              <dt className="col-sm-3">Username</dt>
              <dd className="col-sm-9">{userInfo.username}</dd>
              {userInfo.email && (
                <>
                  <dt className="col-sm-3">Email</dt>
                  <dd className="col-sm-9">{userInfo.email}</dd>
                </>
              )}
            </dl>
          </div>
        )}
        {(settings || settingsUnavailable) && (
          <div>
            <h6>Settings</h6>
            <dl className="row">
              {(settingsUnavailable || settings?.avatar) && (
                <>
                  <dt className="col-sm-3">Avatar</dt>
                  <dd className="col-sm-9">
                    {settingsUnavailable ? (
                      'Currently unavailable'
                    ) : (
                      <img src={settings?.avatar} alt="Avatar" className="img-thumbnail" style={{ maxWidth: '100px' }} />
                    )}
                  </dd>
                </>
              )}
              {(settingsUnavailable || settings?.points !== undefined) && (
                <>
                  <dt className="col-sm-3">Points</dt>
                  <dd className="col-sm-9">{settingsUnavailable ? 'Currently unavailable' : settings?.points}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}