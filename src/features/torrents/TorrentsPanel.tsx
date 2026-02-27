import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { formatBytes } from '../../lib/format'
import {
  addMagnet,
  deleteTorrent,
  getTorrentInfo,
  getTorrents,
  type RdError,
  type TorrentInfo,
  type TorrentItem,
} from '../../lib/realDebrid'
import { getProgressCategory, getProgressColor, getProgressFillPercent } from '../../lib/progress'

type TorrentsPanelProps = {
  accessToken: string | null
  onLoadError?: (message: string, error?: RdError) => void
  onInfo?: (message: string) => void
}

type SortKey = 'filename' | 'size' | 'progress' | 'status'

type SortDirection = 'asc' | 'desc'

type FileSortKey = 'name' | 'size'

type FileSortState = {
  key: FileSortKey
  direction: SortDirection
}

const BTIH_HASH_PATTERN = /^(?:[A-Fa-f0-9]{40}|[A-Za-z2-7]{32})$/

function normalizeMagnetInput(input: string) {
  const value = input.trim()
  if (!value) {
    return null
  }

  if (value.toLowerCase().startsWith('magnet:?')) {
    return value
  }

  if (BTIH_HASH_PATTERN.test(value)) {
    return `magnet:?xt=urn:btih:${value}`
  }

  return null
}

function getTorrentSize(item: TorrentItem) {
  if (typeof item.bytes === 'number') {
    return item.bytes
  }
  if (typeof item.original_bytes === 'number') {
    return item.original_bytes
  }
  return 0
}

export default function TorrentsPanel({ accessToken, onLoadError, onInfo }: TorrentsPanelProps) {
  const [torrents, setTorrents] = useState<TorrentItem[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [magnetLink, setMagnetLink] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('filename')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [fileSortById, setFileSortById] = useState<Record<string, FileSortState | undefined>>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())
  const [torrentInfoById, setTorrentInfoById] = useState<Record<string, TorrentInfo | undefined>>({})
  const [infoLoadingIds, setInfoLoadingIds] = useState<Set<string>>(() => new Set())

  const fetchTorrents = async () => {
    if (!accessToken) {
      setTorrents([])
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const items = await getTorrents(accessToken)
      setTorrents(items)
      setSelectedIds(new Set())
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to load torrents.'
      setErrorMessage(message)
      onLoadError?.(message, rdError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      await deleteTorrent(accessToken, id)
      onInfo?.('Torrent deleted successfully.')
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      await fetchTorrents()
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to delete torrent.'
      setErrorMessage(message)
      onLoadError?.(message, rdError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (!accessToken || selectedIds.size === 0) {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const ids = Array.from(selectedIds)
      for (const id of ids) {
        await deleteTorrent(accessToken, id)
      }
      onInfo?.('Selected torrents deleted successfully.')
      await fetchTorrents()
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to delete selected torrents.'
      setErrorMessage(message)
      onLoadError?.(message, rdError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMagnet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!accessToken) {
      return
    }

    const magnet = normalizeMagnetInput(magnetLink)
    if (!magnet) {
      setErrorMessage('Please enter a valid magnet link or Info hash.')
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      await addMagnet(accessToken, magnet)
      setMagnetLink('')
      await fetchTorrents()
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to add torrent magnet.'
      setErrorMessage(message)
      onLoadError?.(message, rdError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleExpand = async (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })

    if (!accessToken || torrentInfoById[id] || infoLoadingIds.has(id)) {
      return
    }

    setInfoLoadingIds((current) => new Set(current).add(id))
    try {
      const info = await getTorrentInfo(accessToken, id)
      setTorrentInfoById((current) => ({
        ...current,
        [id]: info,
      }))
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to load torrent details.'
      setErrorMessage(message)
      onLoadError?.(message, rdError)
    } finally {
      setInfoLoadingIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }

  // Only fetch torrents when accessToken changes or component mounts, not on every render
  const lastTokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (accessToken && lastTokenRef.current !== accessToken) {
      lastTokenRef.current = accessToken
      void fetchTorrents()
    } else if (!accessToken) {
      lastTokenRef.current = null
    }
  }, [accessToken])

  const filteredTorrents = useMemo(() => {
    const query = filterQuery.trim().toLowerCase()
    if (!query) {
      return torrents
    }
    return torrents.filter((item) => item.filename.toLowerCase().includes(query))
  }, [torrents, filterQuery])

  const sortedTorrents = useMemo(() => {
    const sorted = [...filteredTorrents]
    sorted.sort((left, right) => {
      if (sortKey === 'size') {
        const diff = getTorrentSize(left) - getTorrentSize(right)
        return sortDirection === 'asc' ? diff : -diff
      }
      if (sortKey === 'progress') {
        const leftProgress = typeof left.progress === 'number' ? left.progress : -1
        const rightProgress = typeof right.progress === 'number' ? right.progress : -1
        const diff = leftProgress - rightProgress
        return sortDirection === 'asc' ? diff : -diff
      }
      if (sortKey === 'status') {
        const leftStatus = left.status ?? ''
        const rightStatus = right.status ?? ''
        const comparison = leftStatus.localeCompare(rightStatus)
        return sortDirection === 'asc' ? comparison : -comparison
      }
      const comparison = left.filename.localeCompare(right.filename)
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [filteredTorrents, sortDirection, sortKey])

  const handleSort = (nextKey: SortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection('asc')
  }

  const handleFileSort = (id: string, nextKey: FileSortKey) => {
    setFileSortById((current) => {
      const existing = current[id] ?? { key: 'name', direction: 'asc' }
      if (existing.key === nextKey) {
        return {
          ...current,
          [id]: {
            key: nextKey,
            direction: existing.direction === 'asc' ? 'desc' : 'asc',
          },
        }
      }
      return {
        ...current,
        [id]: {
          key: nextKey,
          direction: 'asc',
        },
      }
    })
  }

  const allVisibleSelected = sortedTorrents.length > 0 && sortedTorrents.every((item) => selectedIds.has(item.id))

  const handleToggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        sortedTorrents.forEach((item) => next.delete(item.id))
        return next
      }
      sortedTorrents.forEach((item) => next.add(item.id))
      return next
    })
  }

  const handleToggleOne = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="row">
          <div className="col">
            <h5 className="card-title">Torrents</h5>
          </div>
          <div className="col-12 col-md-3">
            <input
              id="torrentsFilter"
              className="form-control"
              type="search"
              placeholder="Search"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
            />
          </div>
          <div className="col-auto">
          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={handleDeleteSelected}
            disabled={isLoading || selectedIds.size === 0}
          >
            <i className="bi bi-trash"></i>
            <span className="visually-hidden">Delete selected</span>
          </button>
          </div>
          <div className="col-auto">
          <button className="btn btn-primary" type="button" onClick={fetchTorrents} disabled={isLoading}>
            Refresh
          </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleAddMagnet}>
          <label className="form-label" htmlFor="magnetLink">
            Add magnet link or Info hash
          </label>
          <div className="input-group">
            <input
              id="magnetLink"
              className="form-control"
              type="text"
              placeholder="magnet:?xt=urn:btih:... or info hash"
              value={magnetLink}
              onChange={(event) => setMagnetLink(event.target.value)}
              disabled={isLoading}
              required
            />
            <button className="btn btn-primary" type="submit" disabled={isLoading || !magnetLink.trim()}>
              Submit
            </button>
          </div>
          <div className="form-text">Limits: 2000GB torrent size, 72 hours torrent download duration.</div>
        </form>
        {errorMessage && (
          <div className="alert alert-warning" role="alert">
            {errorMessage}
          </div>
        )}
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>
                  <span className="visually-hidden">Toggle details</span>
                </th>
                <th>
                  <button
                    className="btn btn-link"
                    type="button"
                    onClick={() => handleSort('filename')}
                  >
                    Torrent{sortKey === 'filename' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
                <th>
                  <span className="visually-hidden">Delete</span>
                </th>
                <th>
                  <button
                    className="btn btn-link"
                    type="button"
                    onClick={() => handleSort('size')}
                  >
                    Size{sortKey === 'size' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
                <th>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    aria-label="Select all torrents"
                    checked={allVisibleSelected}
                    onChange={handleToggleAll}
                    disabled={sortedTorrents.length === 0}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTorrents.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    No torrents found.
                  </td>
                </tr>
              )}
              {sortedTorrents.map((item) => {
                const isExpanded = expandedIds.has(item.id)
                const info = torrentInfoById[item.id]
                const isInfoLoading = infoLoadingIds.has(item.id)
                const files = info?.files ?? []
                const fileSortState = fileSortById[item.id] ?? { key: 'name', direction: 'asc' }
                const sortedFiles = [...files].sort((left, right) => {
                  const leftName = left.path ?? left.name ?? ''
                  const rightName = right.path ?? right.name ?? ''
                  if (fileSortState.key === 'size') {
                    const diff = (left.bytes ?? 0) - (right.bytes ?? 0)
                    return fileSortState.direction === 'asc' ? diff : -diff
                  }
                  const comparison = leftName.localeCompare(rightName)
                  return fileSortState.direction === 'asc' ? comparison : -comparison
                })
                const category = getProgressCategory(item.status)
                const percent = getProgressFillPercent(category, item.progress)
                const color = getProgressColor(category)
                const normalizedPercent = Math.min(Math.max(percent, 0), 100)
                const visiblePercent = normalizedPercent === 0 ? 4 : normalizedPercent
                const progressLabel =
                  category === 'done'
                    ? 'Complete'
                    : category === 'error'
                      ? 'Error'
                      : `${Math.round(normalizedPercent)}%`
                const progressStyle = {
                  width: `${visiblePercent}%`,
                  backgroundColor: color,
                }

                return (
                  <Fragment key={item.id}>
                    <tr>
                      <td>
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          aria-label={isExpanded ? `Collapse ${item.filename}` : `Expand ${item.filename}`}
                          onClick={() => handleToggleExpand(item.id)}
                        >
                          {isExpanded ? '-' : '+'}
                        </button>
                      </td>
                      <td>
                        <div>
                          <strong>{item.filename}</strong>
                          <div className="progress" aria-label={`Progress for ${item.filename}`}>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={progressStyle}
                              aria-valuenow={Math.round(normalizedPercent)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuetext={progressLabel}
                            >
                              {progressLabel}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline-danger"
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={isLoading}
                          aria-label={`Delete ${item.filename}`}
                          title="Delete"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                      <td>{formatBytes(getTorrentSize(item))}</td>
                      <td>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          aria-label={`Select ${item.filename}`}
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleToggleOne(item.id)}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5}>
                          <div>
                            {isInfoLoading && <div>Loading torrent details...</div>}
                            {!isInfoLoading && files.length === 0 && (
                              <div>No file details available.</div>
                            )}
                            {!isInfoLoading && files.length > 0 && (
                              <div className="table-responsive">
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>
                                        <button
                                          className="btn btn-link"
                                          type="button"
                                          onClick={() => handleFileSort(item.id, 'name')}
                                        >
                                          File{fileSortState.key === 'name' ? (fileSortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                        </button>
                                      </th>
                                      <th>
                                        <button
                                          className="btn btn-link"
                                          type="button"
                                          onClick={() => handleFileSort(item.id, 'size')}
                                        >
                                          Size{fileSortState.key === 'size' ? (fileSortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                                        </button>
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedFiles.map((file, index) => (
                                      <tr key={`${item.id}-file-${file.id ?? index}`}>
                                        <td>{file.path ?? file.name ?? `File ${index + 1}`}</td>
                                        <td>{formatBytes(file.bytes ?? 0)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
