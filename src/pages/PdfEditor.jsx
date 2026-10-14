import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PdfDropZone from '../components/PdfDropZone'
import PdfPageCard from '../components/PdfPageCard'
import PdfNameDialog from '../components/PdfNameDialog'
import {
  readFileAsBytes,
  renderPageThumbnails,
  getPdfInfo,
  describePdfError,
  downloadPdfBytes,
} from '../utils/pdfUtils'
import {
  sortByOriginalOrder,
  movePage,
  removePages,
  restorePages,
  buildFinalPdf,
} from '../utils/pdfWorkspace'

const btn =
  'text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed'

export default function PdfEditor() {
  // Source files (original bytes, never modified) in merge order.
  const [files, setFiles] = useState([])
  // Current final sequence of pages (after reordering and confirmed deletions).
  const [pages, setPages] = useState([])
  const [selected, setSelected] = useState(() => new Set())
  // Each entry is the list of { page, index } removed by one deletion.
  const [undoStack, setUndoStack] = useState([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [view, setView] = useState('unified') // 'unified' | 'byFile'
  const [busy, setBusy] = useState('') // '' | 'loading' | 'downloading'
  const [progress, setProgress] = useState('')
  const [messages, setMessages] = useState([])
  const [nameDialogOpen, setNameDialogOpen] = useState(false)

  const busyRef = useRef(false)
  const nextFileId = useRef(1)
  const dragIndexRef = useRef(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const isBusy = busy !== ''
  const selectedCount = selected.size

  const positionById = useMemo(() => {
    const map = new Map()
    pages.forEach((p, i) => map.set(p.id, i + 1))
    return map
  }, [pages])

  const orderModified = useMemo(() => {
    const original = sortByOriginalOrder(pages, files)
    return pages.some((p, i) => p.id !== original[i].id)
  }, [pages, files])

  const startBusy = (kind) => {
    busyRef.current = true
    setBusy(kind)
  }
  const endBusy = () => {
    busyRef.current = false
    setBusy('')
    setProgress('')
  }

  /* ---------------------------- Adding files ---------------------------- */

  const addFiles = async (incoming, rejectedNames = []) => {
    if (busyRef.current) return
    const newMessages = rejectedNames.map((n) => `${n}: not a PDF file, skipped.`)
    if (incoming.length === 0) {
      setMessages(newMessages)
      return
    }

    startBusy('loading')
    setConfirmingDelete(false)
    setMessages([])

    const addedFiles = []
    const addedPages = []
    try {
      for (const file of incoming) {
        try {
          setProgress(`Reading ${file.name}…`)
          const bytes = await readFileAsBytes(file)
          const { pageCount } = await getPdfInfo(bytes)
          const id = `f${nextFileId.current}`
          nextFileId.current += 1

          const thumbs = await renderPageThumbnails(bytes, 0.3, (n, total) =>
            setProgress(`Rendering ${file.name}: page ${n} of ${total}`),
          )
          addedFiles.push({ id, name: file.name, bytes, pageCount })
          thumbs.forEach((t) =>
            addedPages.push({
              id: `${id}:${t.originalIndex}`,
              fileId: id,
              fileName: file.name,
              sourceIndex: t.originalIndex,
              dataUrl: t.dataUrl,
            }),
          )
        } catch (err) {
          console.error(err)
          newMessages.push(`${file.name}: ${describePdfError(err)}`)
        }
      }

      // Existing order and deletions are untouched; new pages go at the end.
      if (addedFiles.length > 0) {
        setFiles((prev) => [...prev, ...addedFiles])
        setPages((prev) => [...prev, ...addedPages])
      }
      setMessages(newMessages)
    } finally {
      endBusy()
    }
  }

  /* --------------------------- File management -------------------------- */

  const removeFile = (fileId) => {
    if (busyRef.current) return
    const file = files.find((f) => f.id === fileId)
    if (!file) return
    const pagesInDoc = pages.filter((p) => p.fileId === fileId).length
    const ok = window.confirm(
      `Remove "${file.name}" from the workspace?\n\n${pagesInDoc} page(s) from this file will be removed from the final document.`,
    )
    if (!ok) return

    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setPages((prev) => prev.filter((p) => p.fileId !== fileId))
    setSelected((prev) => {
      const next = new Set(prev)
      pages.filter((p) => p.fileId === fileId).forEach((p) => next.delete(p.id))
      return next
    })
    // Undo history could refer to the removed file, so it is cleared.
    setUndoStack([])
    setConfirmingDelete(false)
    setMessages([])
  }

  const moveFile = (fileId, direction) => {
    if (busyRef.current) return
    const index = files.findIndex((f) => f.id === fileId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= files.length) return
    const nextFiles = [...files]
    const [moved] = nextFiles.splice(index, 1)
    nextFiles.splice(target, 0, moved)
    setFiles(nextFiles)
    // Changing the file order rebuilds the combined sequence (same as Reset Page Order).
    setPages(sortByOriginalOrder(pages, nextFiles))
  }

  const startNewSession = () => {
    if (busyRef.current) return
    if (files.length > 0 && !window.confirm('Clear the workspace and start over? All uploaded PDFs and changes will be discarded.')) {
      return
    }
    setFiles([])
    setPages([])
    setSelected(new Set())
    setUndoStack([])
    setConfirmingDelete(false)
    setMessages([])
  }

  /* ----------------------------- Reordering ----------------------------- */

  const handleDrop = (dropIndex) => {
    const dragIndex = dragIndexRef.current
    dragIndexRef.current = null
    setDragOverIndex(null)
    if (dragIndex === null) return
    setPages((prev) => movePage(prev, dragIndex, dropIndex))
  }

  const handleResetOrder = () => {
    setPages((prev) => sortByOriginalOrder(prev, files))
  }

  /* ------------------------------ Selection ----------------------------- */

  const toggleSelected = (pageId) => {
    if (busyRef.current) return
    setConfirmingDelete(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(pageId)) next.delete(pageId)
      else next.add(pageId)
      return next
    })
  }

  const clearSelection = () => {
    setSelected(new Set())
    setConfirmingDelete(false)
  }

  const selectAll = () => {
    setSelected(new Set(pages.map((p) => p.id)))
    setConfirmingDelete(false)
  }

  /* ------------------------------- Deleting ----------------------------- */

  const requestDelete = () => {
    if (selectedCount === 0) return
    if (selectedCount >= pages.length) {
      setMessages(['At least one page must remain in the PDF. Deselect at least one page.'])
      setConfirmingDelete(false)
      return
    }
    setMessages([])
    setConfirmingDelete(true)
  }

  const confirmDelete = () => {
    if (selectedCount === 0 || selectedCount >= pages.length) {
      setConfirmingDelete(false)
      return
    }
    const { remaining, removed } = removePages(pages, [...selected])
    setPages(remaining)
    setUndoStack((prev) => [...prev, removed])
    setSelected(new Set())
    setConfirmingDelete(false)
  }

  const undoDelete = () => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    setPages((prev) => restorePages(prev, last))
    setUndoStack((prev) => prev.slice(0, -1))
  }

  /* ------------------------------- Download ----------------------------- */

  // Step 1: the Download PDF button asks for the file name first.
  const requestDownload = () => {
    if (busyRef.current) return
    if (pages.length === 0) {
      setMessages(['There are no pages to download. Upload a PDF first.'])
      return
    }
    setNameDialogOpen(true)
  }

  // Step 2: after the name is confirmed, build and download the PDF.
  const handleDownload = async (fileName) => {
    setNameDialogOpen(false)
    if (busyRef.current) return
    if (pages.length === 0) {
      setMessages(['There are no pages to download. Upload a PDF first.'])
      return
    }
    startBusy('downloading')
    setMessages([])
    try {
      const bytes = await buildFinalPdf(files, pages)
      downloadPdfBytes(bytes, fileName)
    } catch (err) {
      console.error(err)
      setMessages(['Something went wrong while generating the PDF. Please try again.'])
    } finally {
      endBusy()
    }
  }

  /* -------------------------------- Render ------------------------------ */

  const hasFiles = files.length > 0

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <Link to="/" className="inline-block mb-3 text-sm text-blue-600 hover:text-blue-800">
            ← Back to Home
          </Link>
          <h1 className="text-xl font-bold text-gray-800">PDF Editor</h1>
          <p className="text-sm text-gray-500">
            Upload one or more PDFs, reorder or delete pages, then download a single final PDF.
            Everything happens in your browser — files are never uploaded anywhere.
          </p>
        </div>

        {messages.length > 0 ? (
          <div className="border border-red-300 bg-red-50 text-red-700 text-sm rounded px-3 py-2 flex justify-between gap-3">
            <ul className="space-y-1">
              {messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            <button type="button" className="text-red-500 hover:text-red-700" onClick={() => setMessages([])} aria-label="Dismiss">
              ✕
            </button>
          </div>
        ) : null}

        {/* Upload + file list */}
        <div className="bg-white rounded-lg shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              {hasFiles ? 'Uploaded PDFs (merge order)' : 'Upload PDFs'}
            </h2>
            {hasFiles ? (
              <button type="button" className={btn} onClick={startNewSession} disabled={isBusy}>
                Start New Session
              </button>
            ) : null}
          </div>

          <PdfDropZone
            multiple
            compact={hasFiles}
            disabled={isBusy}
            onFilesSelected={addFiles}
          />
          {hasFiles ? (
            <p className="text-xs text-gray-400">
              Drop or select more PDFs to add them to the end of the document.
            </p>
          ) : null}

          {isBusy && busy === 'loading' ? (
            <p className="text-sm text-blue-600">{progress || 'Processing…'}</p>
          ) : null}

          {hasFiles ? (
            <>
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                {files.map((f, i) => {
                  const inDoc = pages.filter((p) => p.fileId === f.id).length
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="text-gray-400 mr-2">{i + 1}.</span>
                        <span className="font-medium text-gray-800 break-all">{f.name}</span>
                        <span className="text-gray-500">
                          {' '}— {f.pageCount} page{f.pageCount === 1 ? '' : 's'}
                          {inDoc !== f.pageCount ? ` (${inDoc} in document)` : ''}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button type="button" className={btn} disabled={isBusy || i === 0} onClick={() => moveFile(f.id, -1)} title="Move file earlier">
                          ↑
                        </button>
                        <button type="button" className={btn} disabled={isBusy || i === files.length - 1} onClick={() => moveFile(f.id, 1)} title="Move file later">
                          ↓
                        </button>
                        <button type="button" className={`${btn} text-red-600`} disabled={isBusy} onClick={() => removeFile(f.id)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {files.length > 1 ? (
                <p className="text-xs text-gray-400">
                  Moving a file up or down rebuilds the combined page order (manual page moves are reset; deleted pages stay deleted).
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Workspace */}
        {hasFiles ? (
          <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{pages.length}</span> page{pages.length === 1 ? '' : 's'} in final document
                {selectedCount > 0 ? (
                  <span className="ml-2 text-red-600 font-medium">({selectedCount} selected for deletion)</span>
                ) : null}
                {orderModified ? <span className="ml-2 text-amber-600 font-medium">(reordered)</span> : null}
              </div>

              <div className="inline-flex rounded border border-gray-300 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setView('unified')}
                  className={`px-3 py-1.5 ${view === 'unified' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  Unified (final order)
                </button>
                <button
                  type="button"
                  onClick={() => setView('byFile')}
                  className={`px-3 py-1.5 ${view === 'byFile' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  By file
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" className={`${btn} border-red-300 text-red-700 hover:bg-red-50`} disabled={isBusy || selectedCount === 0} onClick={requestDelete}>
                Delete Selected Pages{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
              <button type="button" className={btn} disabled={isBusy || selectedCount === 0} onClick={clearSelection}>
                Clear Selection
              </button>
              <button type="button" className={btn} disabled={isBusy || pages.length === 0} onClick={selectAll}>
                Select All
              </button>
              <button type="button" className={btn} disabled={isBusy || undoStack.length === 0} onClick={undoDelete}>
                Undo Last Deletion
              </button>
              <button type="button" className={btn} disabled={isBusy || !orderModified} onClick={handleResetOrder}>
                Reset Page Order
              </button>
              <button
                type="button"
                onClick={requestDownload}
                disabled={isBusy || pages.length === 0}
                className="ml-auto text-xs font-semibold bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === 'downloading' ? 'Building PDF…' : '⬇ Download PDF'}
              </button>
            </div>

            {confirmingDelete ? (
              <div className="border border-amber-300 bg-amber-50 text-amber-900 text-sm rounded px-3 py-2 flex flex-wrap items-center gap-3">
                <span>
                  Delete {selectedCount} selected page{selectedCount === 1 ? '' : 's'}? {pages.length - selectedCount} will remain. You can undo this afterwards.
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={confirmDelete} className="text-xs font-semibold bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">
                    Confirm Delete
                  </button>
                  <button type="button" onClick={() => setConfirmingDelete(false)} className={btn}>
                    Cancel
                  </button>
                </span>
              </div>
            ) : null}

            {pages.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No pages in the workspace.</p>
            ) : view === 'unified' ? (
              <>
                <p className="text-xs text-gray-400">
                  Click a page to select it for deletion. Drag a page to a new position (works across files), or use ◀ ▶ to nudge it. The download follows this exact order.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 items-start">
                  {pages.map((page, index) => (
                    <PdfPageCard
                      key={page.id}
                      page={page}
                      position={index + 1}
                      selected={selected.has(page.id)}
                      disabled={isBusy}
                      onToggle={toggleSelected}
                      draggable
                      isDragOver={dragOverIndex === index}
                      onDragStart={() => {
                        dragIndexRef.current = index
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (dragOverIndex !== index) setDragOverIndex(index)
                      }}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={() => {
                        dragIndexRef.current = null
                        setDragOverIndex(null)
                      }}
                      onMoveEarlier={index > 0 ? () => setPages((prev) => movePage(prev, index, index - 1)) : undefined}
                      onMoveLater={index < pages.length - 1 ? () => setPages((prev) => movePage(prev, index, index + 1)) : undefined}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <p className="text-xs text-gray-400">
                  Pages grouped by source file, showing each page's position in the final document. Reordering is done in the Unified view.
                </p>
                {files.map((f) => {
                  const filePages = pages.filter((p) => p.fileId === f.id)
                  return (
                    <div key={f.id}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 break-all">
                        {f.name}{' '}
                        <span className="font-normal text-gray-500">
                          — {filePages.length} of {f.pageCount} page{f.pageCount === 1 ? '' : 's'} in document
                        </span>
                      </h3>
                      {filePages.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">All pages from this file have been deleted.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 items-start">
                          {filePages.map((page) => (
                            <PdfPageCard
                              key={page.id}
                              page={page}
                              position={positionById.get(page.id)}
                              selected={selected.has(page.id)}
                              disabled={isBusy}
                              onToggle={toggleSelected}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <PdfNameDialog
        open={nameDialogOpen}
        defaultName="edited-document"
        onConfirm={handleDownload}
        onCancel={() => setNameDialogOpen(false)}
      />
    </div>
  )
}
