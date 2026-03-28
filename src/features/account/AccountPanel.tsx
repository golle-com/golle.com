import { useCallback, useEffect, useRef, useState } from 'react'
import { getUserInfo, type RdError, type UserInfo } from '../../lib/realDebrid'
import { CopyInput } from '../../lib/CopyInput'

type AccountPanelProps = {
  accessToken: string | null
  onLoadError?: (message: string, error?: RdError) => void
  onLoadWarning?: (message: string) => void
}

export default function AccountPanel({ accessToken, onLoadError }: AccountPanelProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setUserInfo(null)
      return
    }

    setIsLoading(true)

    try {
      const user = await getUserInfo(accessToken)
      setUserInfo(user)
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to load account information.'
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
        
        {userInfo && (
          <section>
            <dl>
              <dt>Account Type</dt>
              <dd>{userInfo.type}</dd>
              <dt>Expiration</dt>
              <dd>{new Date(Date.parse(userInfo.expiration || "")).toLocaleDateString()} ({userInfo.premium ? Math.floor(userInfo.premium / 86400) : 'N/A'} days remaining)</dd>
              <dt>Username</dt>
              <dd>{userInfo.username}</dd>
                <dt>Email</dt>
                <dd>{userInfo.email}</dd>
              <dt>Points</dt>
              <dd>{userInfo.points}</dd>
              <dt>Language</dt>
              <dd>{userInfo.locale}</dd>
              <dt>Avatar</dt>
              <dd>
                <img src={userInfo.avatar} alt="Avatar" style={{ maxWidth: '100px' }} />
              </dd>
              <dt>Your HTTP folder</dt>
              <dd>
                  https://my.real-debrid.com/&lt;password&gt;/
              </dd>
              <dt>WebDAV URL</dt>
              <dd>
                <a href="https://dav.real-debrid.com/" target="_blank" rel="noopener noreferrer">
                  https://dav.real-debrid.com/
                </a>
              </dd>
              <dt>WebDAV Username</dt>
              <dd>{userInfo.username}</dd>
            </dl>
          </section>
        )}
        {accessToken && (
          <section>
            <h6>API Key (This is what you are logged in as</h6>
            <div className="input-group">
              <CopyInput value={accessToken} />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}