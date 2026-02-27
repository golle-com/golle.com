import { useState } from 'react'
import { getUserInfo, type RdError } from '../../lib/realDebrid'
import { saveAuthTokens, type AuthTokens } from '../../lib/storage'

const DEFAULT_CLIENT_ID = 'X245A4XAIBGVM'

type TokenPasteProps = {
  onTokensSaved: (tokens: AuthTokens) => void
  onAuthSuccess: () => void
  onAuthError: (message: string) => void
}

export default function TokenPaste({ onTokensSaved, onAuthSuccess, onAuthError }: TokenPasteProps) {
  const [accessToken, setAccessToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    const trimmedToken = accessToken.trim()
    if (!trimmedToken) {
      return
    }

    setIsLoading(true)
    try {
      await getUserInfo(trimmedToken)
      const tokens: AuthTokens = {
        accessToken: trimmedToken,
        refreshToken: '',
        expiresAt: 0,
        clientId: DEFAULT_CLIENT_ID,
      }

      saveAuthTokens(tokens)
      onTokensSaved(tokens)
      onAuthSuccess()
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Token is not valid.'
      onAuthError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled = accessToken.trim().length === 0 || isLoading

  return (
    <div className="card">
      <div className="card-header">
        <h5>Use Existing Token</h5>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-12">
            <label className="form-label">Access Token ( <a target="_blank" href="https://real-debrid.com/apitoken">Get Here</a> )</label>
          </div>
        </div>
        <div className="row">
          <div className="col-12">
            <div className="btn-group" role="group" aria-label="Token actions">
              <input
                className="form-control"
                type="text"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
              />
              <button className="btn btn-primary" type="button" onClick={handleSave} disabled={isDisabled}>
                {isLoading ? 'Checking...' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
