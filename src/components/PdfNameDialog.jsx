import { useEffect, useRef, useState } from 'react'
import { sanitizeFileName } from '../utils/fileName'

/**
 * Asks "what should the downloaded PDF be called?" before a download.
 * onConfirm receives the cleaned file name, always ending in ".pdf".
 */
export default function PdfNameDialog({ open, defaultName, onConfirm, onCancel }) {
  const [name, setName] = useState(defaultName || '')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName(defaultName || '')
      setError('')
      const t = setTimeout(() => inputRef.current?.select(), 0)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open, defaultName])

  if (!open) return null

  const finalName = sanitizeFileName(name)

  const submit = (e) => {
    e.preventDefault()
    if (!finalName) {
      setError('Please enter a name for the PDF.')
      return
    }
    onConfirm(finalName)
  }

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-white rounded-lg shadow-lg p-5 space-y-3"
        role="dialog"
        aria-modal="true"
        aria-label="Name your PDF"
      >
        <h2 className="text-base font-semibold text-gray-800">Name your PDF</h2>
        <p className="text-sm text-gray-500">What should the downloaded file be called?</p>

        <div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. billing-report-september"
              aria-label="PDF file name"
            />
            <span className="text-sm text-gray-500">.pdf</span>
          </div>
          {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
          {!error && finalName ? (
            <p className="text-xs text-gray-400 mt-1 break-all">Will be saved as: {finalName}</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="text-sm font-semibold bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700"
          >
            Download
          </button>
        </div>
      </form>
    </div>
  )
}
