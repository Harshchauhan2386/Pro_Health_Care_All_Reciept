import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PdfDropZone from '../components/PdfDropZone'
import {
  readFileAsBytes,
  renderPageThumbnails,
  buildReorderedPdf,
  downloadPdfBytes,
} from '../utils/pdfUtils'

export default function PdfPageAdjuster() {
  const [fileName, setFileName] = useState('')
  const [bytes, setBytes] = useState(null)
  const [originalPages, setOriginalPages] = useState([])
  const [pages, setPages] = useState([])
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')
  const dragIndexRef = useRef(null)

  const reset = () => {
    setFileName('')
    setBytes(null)
    setOriginalPages([])
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
      setOriginalPages(thumbnails)
      setPages(thumbnails)
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

  const handleResetOrder = () => {
    setPages(originalPages)
  }

  const handleDragStart = (index) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (dropIndex) => {
    const dragIndex = dragIndexRef.current
    dragIndexRef.current = null
    if (dragIndex === null || dragIndex === dropIndex) return

    setPages((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(dropIndex, 0, moved)
      return next
    })
  }

  const handleDownload = async () => {
    if (!bytes || pages.length === 0) return
    try {
      const order = pages.map((p) => p.originalIndex)
      const newBytes = await buildReorderedPdf(bytes, order)
      downloadPdfBytes(newBytes, 'reordered-document.pdf')
    } catch (err) {
      console.error(err)
      setError('Something went wrong while generating the PDF. Please try again.')
    }
  }

  const isReordered = pages.some((p, i) => p.originalIndex !== originalPages[i]?.originalIndex)

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-block mb-3 text-sm text-blue-600 hover:text-blue-800">
          ← Back to Home
        </Link>

        <header className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">PDF Page Adjuster</h1>
          <p className="text-sm text-gray-500">
            Upload a PDF, drag pages into the order you want, then download the result.
            Everything happens in your browser — the file is never uploaded anywhere.
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
                <span className="font-medium">{fileName}</span> — {pages.length} page
                {pages.length === 1 ? '' : 's'}
                {isReordered ? (
                  <span className="ml-2 text-amber-600 font-medium">(reordered)</span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetOrder}
                  className="text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50"
                >
                  Reset Order
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
              Drag a page thumbnail to move it anywhere in the sequence.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {pages.map((page, index) => (
                <div
                  key={page.originalIndex}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  className="border border-gray-300 rounded bg-gray-50 p-2 cursor-move hover:border-blue-400"
                  title="Drag to reorder"
                >
                  <img
                    src={page.dataUrl}
                    alt={`Original page ${page.pageNumber}`}
                    className="w-full border border-gray-200 bg-white"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Position {index + 1}</span>
                    <span className="text-xs text-gray-400">Orig. p.{page.pageNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
