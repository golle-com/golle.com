import { useCallback, useEffect, useRef, useState } from 'react'
import { getUserInfo, type RdError, type UserInfo } from '../../lib/realDebrid'

type AccountPanelProps = {
  accessToken: string | null
  onLoadError?: (message: string, error?: RdError) => void
  onLoadWarning?: (message: string) => void
}

export default function AccountPanel({ accessToken, onLoadError }: AccountPanelProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setUserInfo(null)
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const user = await getUserInfo(accessToken)
      setUserInfo(user)
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to load account information.'
      setErrorMessage(message)
      onLoadError?.(message, rdError)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, onLoadError])

  // Only fetch account data when accessToken changes or component mounts, not on every render
  const lastTokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (accessToken && lastTokenRef.current !== accessToken) {
      lastTokenRef.current = accessToken
      void fetchData()
    } else if (!accessToken) {
      lastTokenRef.current = null
    }
  }, [accessToken, fetchData])

  return (
    <div className="card">
      <div className="card-header">
        <div className="row">
          <div className="col">
            <h5 className="card-title">Account Information</h5>
          </div>
          <div className="col-auto">
            <button className="btn btn-primary" type="button" onClick={fetchData} disabled={isLoading}>
              Refresh
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        {isLoading && <p>Loading...</p>}
        {errorMessage && (
          <div className="alert alert-warning" role="alert">
            {errorMessage}
          </div>
        )}
        {userInfo && !isLoading && (
          <section>
            <h6>User Info</h6>
            <dl>
              <dt>ID</dt>
              <dd>{userInfo.id}</dd>
              <dt>Username</dt>
              <dd>{userInfo.username}</dd>
              {userInfo.email && (
                <>
                  <dt>Email</dt>
                  <dd>{userInfo.email}</dd>
                </>
              )}
            </dl>
          </section>
        )}
      </div>
    </div>
  )
}