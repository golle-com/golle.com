import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { formatBytes } from '../../lib/format'
import { getTorrentInfo, selectTorrentFiles, type RdError, type TorrentInfoFile } from '../../lib/realDebrid'
import { loadAuthTokens } from '../../lib/storage'

type FileSortKey = 'name' | 'size'

type FileSortState = {
  key: FileSortKey
  direction: 'asc' | 'desc'
}

type TorrentFilesListProps = {
  torrentId: string
}

function getErrorMessage(error: unknown, fallback: string) {
  const rdError = error as RdError
  return rdError?.error || fallback
}

export default function TorrentFilesList({ torrentId }: TorrentFilesListProps) {
  const [files, setFiles] = useState<TorrentInfoFile[]>([])
  const [torrentName, setTorrentName] = useState<string>(torrentId)
  const [isInfoLoading, setIsInfoLoading] = useState(false)
  const [isSelectingFiles, setIsSelectingFiles] = useState(false)
  const [fileSortState, setFileSortState] = useState<FileSortState>({ key: 'name', direction: 'asc' })

  const sortedFiles = useMemo(() => [...files].sort((left, right) => {
    const leftName = left.path ?? left.name ?? ''
    const rightName = right.path ?? right.name ?? ''

    if (fileSortState.key === 'size') {
      const diff = (left.bytes ?? 0) - (right.bytes ?? 0)
      return fileSortState.direction === 'asc' ? diff : -diff
    }

    const comparison = leftName.localeCompare(rightName)
    return fileSortState.direction === 'asc' ? comparison : -comparison
  }), [files, fileSortState])

  const areAllFilesSelected = files.length > 0 && files.every((file) => file.selected === 1)

  const getAccessToken = () => loadAuthTokens()?.accessToken ?? null

  const loadInfo = async () => {
    const accessToken = getAccessToken()
    if (!accessToken) {
      setFiles([])
      return
    }

    setIsInfoLoading(true)
    try {
      const info = await getTorrentInfo(accessToken, torrentId)
      setFiles(info.files ?? [])
      setTorrentName(info.filename || torrentId)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load torrent details.'))
      setFiles([])
    } finally {
      setIsInfoLoading(false)
    }
  }

  useEffect(() => {
    void loadInfo()
  }, [torrentId])

  const saveSelection = async (nextFiles: TorrentInfoFile[], filesPayload: string) => {
    const accessToken = getAccessToken()
    if (!accessToken) {
      return
    }

    setIsSelectingFiles(true)
    try {
      await selectTorrentFiles(accessToken, torrentId, filesPayload)
      setFiles(nextFiles)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update torrent file selection.'))
    } finally {
      setIsSelectingFiles(false)
    }
  }

  const handleSort = (nextKey: FileSortKey) => {
    setFileSortState((current) => {
      if (current.key === nextKey) {
        return {
          key: nextKey,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return {
        key: nextKey,
        direction: 'asc',
      }
    })
  }

  const handleSelectAll = async () => {
    if (isSelectingFiles || files.length === 0) {
      return
    }

    const nextFiles: TorrentInfoFile[] = files.map((file) => ({
      ...file,
      selected: 1,
    }))

    await saveSelection(nextFiles, 'all')
  }

  const handleToggleFile = async (fileId: number) => {
    if (isSelectingFiles) {
      return
    }

    const nextFiles: TorrentInfoFile[] = files.map((file) => {
      if (file.id !== fileId) {
        return file
      }

      return {
        ...file,
        selected: file.selected === 1 ? 0 : 1,
      }
    })

    const selectedFileIds = nextFiles.filter((file) => file.selected !== 0).map((file) => String(file.id))

    if (selectedFileIds.length === 0) {
      return
    }

    const filesPayload = selectedFileIds.length === nextFiles.length ? 'all' : selectedFileIds.join(',')
    await saveSelection(nextFiles, filesPayload)
  }

  return (
    <div>
      {isInfoLoading && <div>Loading torrent details...</div>}
      {!isInfoLoading && files.length === 0 && <div>No file details available.</div>}
      {!isInfoLoading && files.length > 0 && (
        <>
      <div className="row">
        <div className="col-auto">
          {isSelectingFiles ? (
            <span
              role="status"
              aria-label={`Saving file selection for ${torrentName}`}
              title="Saving file selection"
            >
              <i className="bi bi-floppy" aria-hidden="true"></i>
              <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
            </span>
          ) : (
            <input
              className="form-check-input"
              type="checkbox"
              aria-label={`Select all files in ${torrentName}`}
              checked={areAllFilesSelected}
              onChange={() => {
                void handleSelectAll()
              }}
              disabled={files.length === 0}
              title="Select all files"
            />
          )}
        </div>
        <div className="col">
          <button className="btn btn-link" type="button" onClick={() => handleSort('name')}>
            File{fileSortState.key === 'name' ? (fileSortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
          </button>
        </div>
        <div className="col-3 text-end">
          <button className="btn btn-link" type="button" onClick={() => handleSort('size')}>
            Size{fileSortState.key === 'size' ? (fileSortState.direction === 'asc' ? ' ▲' : ' ▼') : ''}
          </button>
        </div>
      </div>
      {sortedFiles.map((file, index) => (
        <div className="row" key={`${torrentId}-file-${file.id}`}>
          <div className="col-auto">
            <input
              className="form-check-input"
              type="checkbox"
              aria-label={`Select ${file.path ?? file.name ?? `File ${index + 1}`}`}
              checked={file.selected !== 0}
              onChange={() => {
                void handleToggleFile(file.id)
              }}
              disabled={isSelectingFiles}
            />
          </div>
          <div className="col">{file.path ?? file.name ?? `File ${index + 1}`}</div>
          <div className="col-3 text-end">{formatBytes(file.bytes ?? 0)}</div>
        </div>
      ))}
        </>
      )}
    </div>
  )
}