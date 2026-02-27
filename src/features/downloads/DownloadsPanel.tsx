import { useEffect, useMemo, useRef, useState } from 'react'
import { formatBytes } from '../../lib/format'
import { deleteDownload, getDownloads, type DownloadItem, type RdError } from '../../lib/realDebrid'

type DownloadsPanelProps = {
  accessToken: string | null
  onLoadError?: (message: string, error?: RdError) => void
}

export default function DownloadsPanel({ accessToken, onLoadError }: DownloadsPanelProps) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [sortKey, setSortKey] = useState<'filename' | 'filesize'>('filename')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const fetchDownloads = async () => {
    if (!accessToken) {
      setDownloads([])
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const items = await getDownloads(accessToken)
      setDownloads(items)
      setSelectedIds(new Set())
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to load downloads.'
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
      await deleteDownload(accessToken, id)
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      await fetchDownloads()
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to delete download.'
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
        await deleteDownload(accessToken, id)
      }
      await fetchDownloads()
    } catch (error) {
      const rdError = error as RdError
      const message = rdError.error || 'Failed to delete selected downloads.'
      setErrorMessage(message)
      onLoadError?.(message, rdError)
    } finally {
      setIsLoading(false)
    }
  }

  // Only fetch downloads when accessToken changes or component mounts, not on every render
  const lastTokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (accessToken && lastTokenRef.current !== accessToken) {
      lastTokenRef.current = accessToken
      void fetchDownloads()
    } else if (!accessToken) {
      setDownloads([])
      setSelectedIds(new Set())
      lastTokenRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const filteredDownloads = useMemo(() => {
    const query = filterQuery.trim().toLowerCase()
    if (!query) {
      return downloads
    }
    return downloads.filter((item) => item.filename.toLowerCase().includes(query))
  }, [downloads, filterQuery])

  const sortedDownloads = useMemo(() => {
    const sorted = [...filteredDownloads]
    sorted.sort((left, right) => {
      if (sortKey === 'filesize') {
        const diff = left.filesize - right.filesize
        return sortDirection === 'asc' ? diff : -diff
      }
      const comparison = left.filename.localeCompare(right.filename)
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [filteredDownloads, sortDirection, sortKey])

  const handleSort = (nextKey: 'filename' | 'filesize') => {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextKey)
    setSortDirection('asc')
  }

  const allVisibleSelected = sortedDownloads.length > 0 && sortedDownloads.every((item) => selectedIds.has(item.id))

  const handleToggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        sortedDownloads.forEach((item) => next.delete(item.id))
        return next
      }
      sortedDownloads.forEach((item) => next.add(item.id))
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
    <div className="card shadow-sm">
      <div className="card-header bg-body d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <h5 className="mb-0">Downloads</h5>
        <div className="d-flex flex-wrap gap-2">
          <button
            className="btn btn-outline-danger btn-sm"
            type="button"
            onClick={handleDeleteSelected}
            disabled={isLoading || selectedIds.size === 0}
          >
            <i className="bi bi-trash"></i>
            <span className="visually-hidden">Delete selected</span>
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={fetchDownloads} disabled={isLoading}>
            Refresh
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <input
            id="downloadsFilter"
            className="form-control"
            type="search"
            placeholder="Search downloads"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
          />
        </div>
        {errorMessage && (
          <div className="alert alert-warning" role="alert">
            {errorMessage}
          </div>
        )}
        <div className="table-responsive dense-table-wrap">
          <table className="table table-sm align-middle small dense-table">
            <thead>
              <tr>
                <th>
                  <button
                    className="btn btn-link p-0 text-decoration-none"
                    type="button"
                    onClick={() => handleSort('filename')}
                  >
                    File{sortKey === 'filename' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
                <th className="text-nowrap text-center">
                  <span className="visually-hidden">Delete</span>
                </th>
                <th className="text-nowrap text-end">
                  <button
                    className="btn btn-link p-0 text-decoration-none"
                    type="button"
                    onClick={() => handleSort('filesize')}
                  >
                    Size{sortKey === 'filesize' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
                <th className="text-nowrap text-end">
                  <span className="visually-hidden">Download</span>
                </th>
                <th className="text-nowrap text-end">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    aria-label="Select all downloads"
                    checked={allVisibleSelected}
                    onChange={handleToggleAll}
                    disabled={sortedDownloads.length === 0}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-body-secondary">Loading..</td>
                </tr>
              ) : sortedDownloads.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-body-secondary">No downloads found.</td>
                </tr>
              )}
              {sortedDownloads.map((item) => {
                const streamingUrl = `https://real-debrid.com/streaming-${item.id}`
                return (
                  <tr key={item.id}>
                    <td>
                      <a
                        className="text-reset text-decoration-none"
                        href={streamingUrl}
                        rel="noreferrer"
                        aria-label={`Stream ${item.filename}`}
                        title={`Stream ${item.filename}`}
                      >
                        {item.filename}
                      </a>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-outline-danger btn-sm px-2 py-1"
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={isLoading}
                        aria-label={`Delete ${item.filename}`}
                        title="Delete"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                    <td className="text-nowrap text-end">{formatBytes(item.filesize)}</td>
                    <td className="text-nowrap text-end">
                      {item.download ? (
                        <a
                          className="btn btn-outline-secondary btn-sm px-2 py-1"
                          href={item.download}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Download ${item.filename}`}
                          title="Download"
                        >
                          <i className="bi bi-download"></i>
                        </a>
                      ) : (
                        <button
                          className="btn btn-outline-secondary btn-sm px-2 py-1"
                          type="button"
                          disabled
                          aria-label="No download link"
                        >
                          <i className="bi bi-download"></i>
                        </button>
                      )}
                    </td>
                    <td className="text-end">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        aria-label={`Select ${item.filename}`}
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleToggleOne(item.id)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
