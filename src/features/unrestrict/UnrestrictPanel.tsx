import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatBytes } from '../../lib/format'
import {
  getUnrestrictCheck,
  unrestrictFolder,
  unrestrictLink,
  type RdError,
  type UnrestrictCheckResponse,
  type UnrestrictLinkResponse,
} from '../../lib/realDebrid'

type UnrestrictPanelProps = {
  accessToken: string | null
  onLoadError?: (message: string) => void
  onInfo?: (message: string) => void
}

function getNumericValue(value: unknown) {
  return typeof value === 'number' ? value : null
}

function getStringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function getFolderLinks(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as { links?: unknown }
    if (Array.isArray(candidate.links)) {
      return candidate.links.filter((item): item is string => typeof item === 'string' && item.length > 0)
    }
  }

  return []
}

export default function UnrestrictPanel({ accessToken, onLoadError, onInfo }: UnrestrictPanelProps) {
  const [linkInput, setLinkInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [folderInput, setFolderInput] = useState('')
  const [useRemoteTraffic, setUseRemoteTraffic] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [isUnrestricting, setIsUnrestricting] = useState(false)
  const [isUnrestrictingFolder, setIsUnrestrictingFolder] = useState(false)
  const [checkResult, setCheckResult] = useState<UnrestrictCheckResponse | null>(null)
  const [linkResult, setLinkResult] = useState<UnrestrictLinkResponse | null>(null)
  const [folderLinks, setFolderLinks] = useState<string[]>([])

  const performCheckLink = async () => {
    if (!accessToken) {
      return
    }

    const link = linkInput.trim()
    if (!link) {
      onLoadError?.('Please enter a link to check.')
      return
    }

    setIsChecking(true)

    try {
      const result = await getUnrestrictCheck(accessToken, link, passwordInput)
      setCheckResult(result)
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to check link.'
      onLoadError?.(message)
    } finally {
      setIsChecking(false)
    }
  }

  const handleCheckLinkClick = () => {
    void performCheckLink()
  }

  const handleUnrestrictLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    const link = linkInput.trim()
    if (!link) {
      onLoadError?.('Please enter a link to unrestrict.')
      return
    }

    setIsUnrestricting(true)

    try {
      const result = await unrestrictLink(accessToken, link, passwordInput, useRemoteTraffic)
      setLinkResult(result)
      const downloadUrl = getStringValue(result.download)
      if (downloadUrl) {
        onInfo?.('Link unrestricted successfully.')
      }
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to unrestrict link.'
      onLoadError?.(message)
    } finally {
      setIsUnrestricting(false)
    }
  }

  const handleUnrestrictFolder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    const link = folderInput.trim()
    if (!link) {
      onLoadError?.('Please enter a folder link to unrestrict.')
      return
    }

    setIsUnrestrictingFolder(true)

    try {
      const result = await unrestrictFolder(accessToken, link)
      const links = getFolderLinks(result)
      setFolderLinks(links)
      onInfo?.(`Folder unrestricted (${links.length} links).`)
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to unrestrict folder.'
      onLoadError?.(message)
    } finally {
      setIsUnrestrictingFolder(false)
    }
  }

  const checkFilename = getStringValue(checkResult?.filename)
  const checkHost = getStringValue(checkResult?.host)
  const checkSize = getNumericValue(checkResult?.filesize)
  const checkSupported = getNumericValue(checkResult?.supported)
  const checkStreamable = getNumericValue(checkResult?.streamable)

  const unrestrictedFilename = getStringValue(linkResult?.filename)
  const unrestrictedHost = getStringValue(linkResult?.host)
  const unrestrictedSize = getNumericValue(linkResult?.filesize)
  const unrestrictedDownload = getStringValue(linkResult?.download)

  return (
    <div className="card">
      <div className="card-header">
        <h5>Unrestrict</h5>
      </div>
      <div className="card-body">
        <div className="alert alert-warning" role="alert">
          Unrestrict works only for hosts listed on the <Link to="/hosts">Hosts</Link> page.
        </div>

        <section>
          <h6>Link</h6>
          <form onSubmit={handleUnrestrictLink}>
            <input
              className="form-control"
              type="url"
              placeholder="https://example.com/file"
              value={linkInput}
              onChange={(event) => setLinkInput(event.target.value)}
            />
            <input
              className="form-control"
              type="text"
              placeholder="Password (optional)"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
            />
            <div className="form-check">
              <input
                id="remoteTraffic"
                className="form-check-input"
                type="checkbox"
                checked={useRemoteTraffic}
                onChange={(event) => setUseRemoteTraffic(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="remoteTraffic">
                Use remote traffic
              </label>
            </div>
            <div>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={handleCheckLinkClick}
                disabled={isChecking || isUnrestricting}
              >
                Check
              </button>
              <button className="btn btn-primary" type="submit" disabled={isChecking || isUnrestricting}>
                Unrestrict
              </button>
            </div>
          </form>

          {checkResult && (
            <div>
              <div><strong>Host:</strong> {checkHost ?? 'Unknown'}</div>
              <div><strong>Filename:</strong> {checkFilename ?? 'Unknown'}</div>
              <div><strong>Size:</strong> {checkSize !== null ? formatBytes(checkSize) : 'Unknown'}</div>
              <div><strong>Supported:</strong> {checkSupported === 1 ? 'Yes' : checkSupported === 0 ? 'No' : 'Unknown'}</div>
              <div><strong>Streamable:</strong> {checkStreamable === 1 ? 'Yes' : checkStreamable === 0 ? 'No' : 'Unknown'}</div>
            </div>
          )}

          {linkResult && (
            <div>
              <div><strong>Host:</strong> {unrestrictedHost ?? 'Unknown'}</div>
              <div><strong>Filename:</strong> {unrestrictedFilename ?? 'Unknown'}</div>
              <div><strong>Size:</strong> {unrestrictedSize !== null ? formatBytes(unrestrictedSize) : 'Unknown'}</div>
              <div>
                <strong>Download:</strong>{' '}
                {unrestrictedDownload ? (
                  <a href={unrestrictedDownload} target="_blank" rel="noreferrer">
                    Open unrestricted link
                  </a>
                ) : (
                  'Unavailable'
                )}
              </div>
            </div>
          )}
        </section>

        <section>
          <h6>Folder</h6>
          <form onSubmit={handleUnrestrictFolder}>
            <input
              className="form-control"
              type="url"
              placeholder="https://example.com/folder"
              value={folderInput}
              onChange={(event) => setFolderInput(event.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={isUnrestrictingFolder}>
              Unrestrict folder
            </button>
          </form>

          {folderLinks.length > 0 && (
            <ul className="list-group list-group-flush">
              {folderLinks.map((link) => (
                <li key={link} className="list-group-item">
                  <a href={link} target="_blank" rel="noreferrer">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </div>
  )
}
