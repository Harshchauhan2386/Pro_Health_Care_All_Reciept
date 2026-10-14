import { useState } from 'react'
import { Link } from 'react-router-dom'
import PdfDropZone from '../components/PdfDropZone'
import {
  readFileAsBytes,
  renderPageThumbnails,
  buildPdfWithPagesRemoved,
  downloadPdfBytes,
} from '../utils/pdfUtils'

export default function PdfPageDeleter() {
  const [fileName, setFileName] = useState('')
  const [bytes, setBytes] = useState(null)
  // pages: { originalIndex, pageNumber, dataUrl, selected, removed }
  const [pages, setPages] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')

  const reset = () => {
    setFileName('')
    setBytes(null)
    setPages([])
    setStatus('idle')
    setError('')
  }

  const handleFileSelected = async (file) => {
    setStatus('loading')
    setError('')
    try {
      const fileBytes = await readFileAsBytes(file)
      const thumbnails = await renderPageThumbnails(fileBytes)
      setBytes(fileBytes)
      setFileName(file.name)
      setPages(thumbnails.map((t) => ({ ...t, selected: false, removed: false })))
      setStatus('ready')
    } catch (err) {
      console.error(err)
      setError(
        'Could not read this PDF. It may be corrupted, empty, or password-protected. Please try another file.',
      )
      setStatus('error')
    }
  }

  const handleInvalidFile = (message) => {
    setError(message)
    setStatus('error')
  }

  const toggleSelected = (originalIndex) => {
    setPages((prev) =>
      prev.map((p) =>
        p.originalIndex === originalIndex && !p.removed ? { ...p, selected: !p.selected } : p,
      ),
    )
  }

  const remainingCount = pages.filter((p) => !p.removed).length
  const selectedCount = pages.filter((p) => p.selected && !p.removed).length

  const handleDeleteSelected = () => {
    setError('')
    if (selectedCount === 0) return

    if (remainingCount - selectedCount <= 0) {
      setError('At least one page must remain in the PDF.')
      return
    }

    setPages((prev) =>
      prev.map((p) => (p.selected && !p.removed ? { ...p, removed: true, selected: false } : p)),
    )
  }

  const handleResetAll = () => {
    setError('')
    setPages((prev) => prev.map((p) => ({ ...p, selected: false, removed: false })))
  }

  const handleDownload = async () => {
    const remainingIndices = pages.filter((p) => !p.removed).map((p) => p.originalIndex)
    if (remainingIndices.length === 0) {
      setError('At least one page must remain in the PDF.')
      return
    }
    try {
      const newBytes = await buildPdfWithPagesRemoved(
        bytes,
        pages.filter((p) => p.removed).map((p) => p.originalIndex),
      )
      downloadPdfBytes(newBytes, 'modified-document.pdf')
    } catch (err) {
      console.error(err)
      setError('Something went wrong while generating the PDF. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm text-blue-600 hover:text-blue-800">
          ← Back to Home
        </Link>

        <header className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Delete PDF Pages</h1>
          <p className="text-sm text-gray-500">
            Upload a PDF, select the pages to remove, then download the result. Everything
            happens in your browser — the file is never uploaded anywhere.
          </p>
        </header>

        {status === 'idle' || status === 'error' ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <PdfDropZone onFileSelected={handleFileSelected} onInvalidFile={handleInvalidFile} />
            {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
          </div>
        ) : null}

        {status === 'loading' ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-sm text-gray-500">
            Reading PDF and generating page previews…
          </div>
        ) : null}

        {status === 'ready' ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{fileName}</span> — {remainingCount} of{' '}
                {pages.length} page{pages.length === 1 ? '' : 's'} remaining
                {selectedCount > 0 ? (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({selectedCount} selected)
                  </span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedCount === 0}
                  className="text-xs font-medium border border-red-300 text-red-700 px-3 py-1.5 rounded hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete Selected Pages
                </button>
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50"
                >
                  Upload Another PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
                >
                  ⬇ Download PDF
                </button>
              </div>
            </div>

            {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}

            <p className="text-xs text-gray-400 mb-3">
              Click a page to select it (or use its checkbox), then click "Delete Selected
              Pages". Removed pages stay visible, greyed out, until you download or reset.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {pages.map((page) => (
                <div
                  key={page.originalIndex}
                  onClick={() => toggleSelected(page.originalIndex)}
                  className={`border rounded p-2 ${
                    page.removed
                      ? 'opacity-40 border-gray-200 cursor-not-allowed'
                      : page.selected
                        ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50 cursor-pointer'
                        : 'border-gray-300 bg-gray-50 cursor-pointer hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <input
                      type="checkbox"
                      checked={page.selected}
                      disabled={page.removed}
                      onChange={() => toggleSelected(page.originalIndex)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-xs text-gray-500">Page {page.pageNumber}</span>
                  </div>
                  <img
                    src={page.dataUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full border border-gray-200 bg-white"
                  />
                  {page.removed ? (
                    <div className="text-xs text-red-500 text-center mt-1">Removed</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
