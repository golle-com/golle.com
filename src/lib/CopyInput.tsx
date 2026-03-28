import { useState } from 'react'

type CopyInputProps = {
  value: string
  readOnly?: boolean
}

export function CopyInput({ value, readOnly = true }: CopyInputProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  return (
    <div className="input-group">
      <input
        type="text"
        className="form-control"
        value={value}
        readOnly={readOnly}
      />
      <button
        className={`btn ${copied ? 'btn-success' : 'btn-outline-secondary'}`}
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <span className="bi bi-check-circle"></span> Copied
          </>
        ) : (
          'Copy'
        )}
      </button>
    </div>
  )
}