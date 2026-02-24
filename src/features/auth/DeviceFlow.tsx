import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getDeviceCode,
  getDeviceCredentials,
  getTokenWithDeviceCode,
  type DeviceCodeResponse,
  type RdError,
} from '../../lib/realDebrid'
import { saveAuthTokens, type AuthTokens } from '../../lib/storage'

const OPEN_SOURCE_CLIENT_ID = 'X245A4XAIBGVM'
const MAX_POLLING_DURATION_MS = 30_000
const MAX_BACKOFF_DELAY_MS = 10_000

function getPollingWindowMs(info: DeviceCodeResponse) {
  const codeExpiryMs = Math.max(1000, info.expires_in * 1000)
  return Math.min(MAX_POLLING_DURATION_MS, codeExpiryMs)
}

function copyWithExecCommand(text: string) {
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.top = '-9999px'
  textArea.style.left = '-9999px'
  textArea.style.opacity = '0'
  textArea.style.fontSize = '16px'
  document.body.appendChild(textArea)

  const selection = document.getSelection()
  const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

  textArea.focus()
  textArea.select()
  textArea.setSelectionRange(0, textArea.value.length)

  let wasCopied = false
  try {
    wasCopied = document.execCommand('copy')
  } catch {
    wasCopied = false
  }

  document.body.removeChild(textArea)

  if (selectedRange && selection) {
    selection.removeAllRanges()
    selection.addRange(selectedRange)
  }

  return wasCopied
}

type DeviceFlowProps = {
  onTokensSaved: (tokens: AuthTokens) => void
  onAuthSuccess: () => void
  onAuthError: (message: string) => void
  onInfo: (message: string) => void
  onPendingInfo: (message: string, timeoutMs: number) => void
}

export default function DeviceFlow({
  onTokensSaved,
  onAuthSuccess,
  onAuthError,
  onInfo,
  onPendingInfo,
}: DeviceFlowProps) {
  const [clientId, setClientId] = useState(OPEN_SOURCE_CLIENT_ID)
  const [deviceInfo, setDeviceInfo] = useState<DeviceCodeResponse | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const pollingRef = useRef<number | null>(null)
  const pollingStartedAtRef = useRef<number | null>(null)
  const pollingAttemptRef = useRef(0)

  const resetDeviceFlowState = useCallback(() => {
    if (pollingRef.current) {
      window.clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    pollingStartedAtRef.current = null
    pollingAttemptRef.current = 0
    setIsPolling(false)
    setIsLoading(false)
    setErrorMessage(null)
    setDeviceInfo(null)
    setClientSecret(null)
    setClientId(OPEN_SOURCE_CLIENT_ID)
  }, [])

  const copyUserCode = useCallback(
    async (code: string) => {
      if (!code) {
        return false
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code)
          onInfo('Device code copied to clipboard.')
          return true
        }
      } catch {
      }

      const copied = copyWithExecCommand(code)
      if (copied) {
        onInfo('Device code copied to clipboard.')
        return true
      }

      onInfo('Copy failed. Tap and hold the code field to copy manually.')
      return false
    },
    [onInfo],
  )

  const handleCopyCode = useCallback(() => {
    if (!deviceInfo?.user_code) {
      return
    }
    void copyUserCode(deviceInfo.user_code)
  }, [copyUserCode, deviceInfo])

  const handleRequestDeviceCode = async () => {
    setErrorMessage(null)
    setIsLoading(true)
    setIsPolling(false)

    try {
      const result = await getDeviceCode(clientId, true)
      setDeviceInfo(result)
      setClientSecret(null)
      setIsPolling(true)
      pollingStartedAtRef.current = Date.now()
      pollingAttemptRef.current = 0
      void copyUserCode(result.user_code)
    } catch (error) {
      const rdError = error as RdError
      setErrorMessage(rdError.error || 'Unable to request device code.')
      setIsPolling(false)
    } finally {
      setIsLoading(false)
    }
  }

  const attemptTokenFetch = useCallback(async (): Promise<'success' | 'pending' | 'stop'> => {
    if (!deviceInfo) {
      return 'stop'
    }

    setErrorMessage(null)
    setIsLoading(true)

    try {
      const elapsedMs = pollingStartedAtRef.current ? Date.now() - pollingStartedAtRef.current : 0
      const pollingWindowMs = getPollingWindowMs(deviceInfo)

      if (elapsedMs >= pollingWindowMs) {
        const timeoutMessage = 'Authorization timed out. Please request a new device code.'
        resetDeviceFlowState()
        onAuthError(timeoutMessage)
        return 'stop'
      }

      let secret = clientSecret
      let resolvedClientId = clientId
      if (!secret) {
        const credentials = await getDeviceCredentials(clientId, deviceInfo.device_code)
        secret = credentials.client_secret
        resolvedClientId = credentials.client_id
        setClientId(credentials.client_id)
        setClientSecret(secret)
      }

      const token = await getTokenWithDeviceCode(resolvedClientId, secret, deviceInfo.device_code)
      const tokens: AuthTokens = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: Date.now() + token.expires_in * 1000,
        clientId: resolvedClientId,
        clientSecret: secret,
      }
      saveAuthTokens(tokens)
      onTokensSaved(tokens)
      setIsPolling(false)
      pollingStartedAtRef.current = null
      onAuthSuccess()
      return 'success'
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Authorization failed.'
      const isPendingAuthorization = rdError.status === 403
      const elapsedMs = pollingStartedAtRef.current ? Date.now() - pollingStartedAtRef.current : 0
      const pollingWindowMs = getPollingWindowMs(deviceInfo)
      const remainingMs = Math.max(1000, pollingWindowMs - elapsedMs)

      if (elapsedMs >= pollingWindowMs) {
        const timeoutMessage = 'Authorization timed out. Please request a new device code.'
        resetDeviceFlowState()
        onAuthError(timeoutMessage)
        return 'stop'
      }

      if (isPendingAuthorization) {
        const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000))
        const pendingMessage = `Waiting for you to enter code on verification page. Timeout in ${remainingSeconds} seconds.`
        onPendingInfo(pendingMessage, remainingMs)
        return 'pending'
      } else {
        setErrorMessage(message)
      }

      if (rdError.status && rdError.status !== 403) {
        setIsPolling(false)
        pollingStartedAtRef.current = null
        onAuthError(message)
        return 'stop'
      }
      if (!rdError.status) {
        setIsPolling(false)
        pollingStartedAtRef.current = null
        onAuthError(message)
        return 'stop'
      }

      return 'stop'
    } finally {
      setIsLoading(false)
    }
  }, [clientId, clientSecret, deviceInfo, onAuthError, onAuthSuccess, onPendingInfo, onTokensSaved, resetDeviceFlowState])

  useEffect(() => {
    if (!isPolling || !deviceInfo) {
      if (pollingRef.current) {
        window.clearTimeout(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    const intervalMs = Math.max(1000, deviceInfo.interval * 1000)
    const pollWindowMs = getPollingWindowMs(deviceInfo)

    const scheduleNextPoll = () => {
      const startedAt = pollingStartedAtRef.current ?? Date.now()
      const elapsedMs = Date.now() - startedAt
      const remainingMs = pollWindowMs - elapsedMs
      if (remainingMs <= 0) {
        const timeoutMessage = 'Authorization timed out. Please request a new device code.'
        resetDeviceFlowState()
        onAuthError(timeoutMessage)
        return
      }

      const exponent = pollingAttemptRef.current
      const backoffDelayMs = Math.min(intervalMs * 2 ** exponent, MAX_BACKOFF_DELAY_MS)
      const nextDelayMs = Math.max(1000, Math.min(backoffDelayMs, remainingMs))
      pollingAttemptRef.current += 1

      pollingRef.current = window.setTimeout(() => {
        void (async () => {
          const result = await attemptTokenFetch()
          if (result === 'pending' && pollingStartedAtRef.current) {
            scheduleNextPoll()
          }
        })()
      }, nextDelayMs)
    }

    void (async () => {
      const result = await attemptTokenFetch()
      if (result === 'pending' && pollingStartedAtRef.current) {
        scheduleNextPoll()
      }
    })()

    return () => {
      if (pollingRef.current) {
        window.clearTimeout(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [attemptTokenFetch, deviceInfo, isPolling, onAuthError, resetDeviceFlowState])

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-body">
        <h5 className="mb-0">Create Device Token</h5>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12">
            <div className="d-grid gap-2 d-md-flex">
              <button
                className="btn btn-primary"
                type="button"
                onClick={handleRequestDeviceCode}
                disabled={isLoading}
              >
                Request Code
              </button>
              {deviceInfo && (
                <button className="btn btn-outline-secondary" type="button" onClick={handleCopyCode}>
                  Copy Code
                </button>
              )}
              {deviceInfo && !isLoading && (
                <div className="d-flex align-items-center gap-2">
                  <a
                    className="btn btn-success"
                    href={deviceInfo.verification_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open RD Device Verification Page
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="form-label">Enter This Code on RD Device Page</label>
                    <input className="form-control" type="text" value={deviceInfo?.user_code ?? ''} readOnly />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {errorMessage && (
            <div className="col-12">
              <div className="alert alert-warning" role="alert">
                {errorMessage}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
