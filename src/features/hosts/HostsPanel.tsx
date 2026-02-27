import { useCallback, useEffect, useRef, useState } from 'react'
import { getHostsStatus, type RdError } from '../../lib/realDebrid'

type HostsPanelProps = {
  accessToken: string | null
  onLoadError?: (message: string) => void
}

type HostStatusRow = {
  name: string
  domain: string
  iconUrl: string | null
  status: 'up' | 'down' | 'unsupported'
  lastChecked: Date | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function parseHostStatus(value: unknown): 'up' | 'down' | 'unsupported' {
  const text = getStringValue(value)?.toLowerCase()

  if (text === 'up') {
    return 'up'
  }
  if (text === 'down') {
    return 'down'
  }
  if (text === 'unsupported') {
    return 'unsupported'
  }

  return 'unsupported'
}

function formatDuration(date: Date | null): string {
  if (!date) {
    return 'N/A'
  }

  const diffMs = Math.abs(Date.now() - date.getTime())
  if (Number.isNaN(diffMs)) {
    return 'N/A'
  }

  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 0) {
    return 'N/A'
  }

  if (diffSec < 60) {
    return `${diffSec} second${diffSec === 1 ? '' : 's'}`
  }

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'}`
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'}`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'}`
  }

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) {
    return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'}`
  }

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths <= 0) {
    return 'N/A'
  }

  return `${diffMonths} month${diffMonths === 1 ? '' : 's'}`
}

function getStatusRows(payload: unknown): HostStatusRow[] {
  if (!isRecord(payload)) {
    return []
  }

  return Object.entries(payload)
    .map(([host, rawValue]): HostStatusRow => {
      if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        return {
          name: host,
          domain: host,
          iconUrl: null,
          status: parseHostStatus(rawValue),
          lastChecked: null,
        }
      }

      if (!isRecord(rawValue)) {
        return {
          name: host,
          domain: host,
          iconUrl: null,
          status: 'unsupported',
          lastChecked: null,
        }
      }

      const domainFromList = getStringArray(rawValue.domains)[0] ?? null
      const domain = getStringValue(rawValue.domain) ?? domainFromList ?? host
      const statusCandidate = rawValue.status
      const lastCheckedCandidate =
        rawValue.check_time ?? rawValue.last_checked ?? rawValue.last_check ?? rawValue.checked ?? rawValue.updated

      return {
        name: getStringValue(rawValue.name) ?? domain,
        domain,
        iconUrl: getStringValue(rawValue.image) ?? getStringValue(rawValue.icon),
        status: parseHostStatus(statusCandidate),
        lastChecked: parseDate(lastCheckedCandidate),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

export default function HostsPanel({ accessToken, onLoadError }: HostsPanelProps) {
  const [rows, setRows] = useState<HostStatusRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchHostsData = useCallback(async () => {
    if (!accessToken) {
      setRows([])
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const statusPayload = await getHostsStatus(accessToken)
      setRows(getStatusRows(statusPayload))
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to load hosts data.'
      setErrorMessage(message)
      onLoadError?.(message)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, onLoadError])

  const lastTokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (accessToken && lastTokenRef.current !== accessToken) {
      lastTokenRef.current = accessToken
      void fetchHostsData()
    } else if (!accessToken) {
      lastTokenRef.current = null
    }
  }, [accessToken, fetchHostsData])

  return (
    <div>
      <div>
        <h5>Hosts</h5>
        <button type="button" className="btn btn-primary" onClick={fetchHostsData} disabled={isLoading}>
          Refresh
        </button>
      </div>
      <div>
        {errorMessage && (
          <div role="alert">
            {errorMessage}
          </div>
        )}

        <div>
          <table>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4}>Loading..</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No hosts found.</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const domainHref = row.domain.startsWith('http://') || row.domain.startsWith('https://')
                    ? row.domain
                    : `https://${row.domain}`

                  return (
                    <tr key={`${row.name}-${row.domain}`}>
                      <td>
                        <a href={domainHref}>
                        {row.iconUrl ? (
                          <img src={row.iconUrl} alt={row.name} width={20} height={20} />
                        ) : (
                          <i className="bi bi-square" aria-hidden="true"></i>
                        )}
                        &nbsp;
                          {row.name}
                        </a>
                      </td>
                      <td>
                        {row.status === 'up' ? (
                        <i
                          className="bi bi-arrow-up text-success"
                          aria-label="Up"
                        ></i>
                         ) : (
                        <i
                          className="bi bi-arrow-down text-danger"
                          aria-label="Down"
                        ></i>
                        )}
                        Last updated {formatDuration(row.lastChecked)} ago
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
