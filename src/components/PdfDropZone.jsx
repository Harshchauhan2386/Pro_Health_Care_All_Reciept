import { useRef, useState } from 'react'
import { isPdfFile } from '../utils/pdfUtils'

/**
 * Upload control (click or drag-and-drop).
 *
 * Single-file mode (default, used by the original tools):
 *   onFileSelected(file), onInvalidFile(message)
 *
 * Multi-file mode (`multiple`, used by the PDF Editor):
 *   onFilesSelected(validFiles, rejectedFileNames)
 */
export default function PdfDropZone({
  onFileSelected,
  onInvalidFile,
  multiple = false,
  onFilesSelected,
  compact = false,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFiles = (fileList) => {
    if (disabled) return
    const all = Array.from(fileList || [])
    if (all.length === 0) return

    if (multiple) {
      const valid = all.filter(isPdfFile)
      const rejected = all.filter((f) => !isPdfFile(f)).map((f) => f.name)
      onFilesSelected?.(valid, rejected)
      return
    }

    const file = all[0]
    if (!isPdfFile(file)) {
      onInvalidFile?.('Only PDF files are supported. Please choose a .pdf file.')
      return
    }
    onFileSelected(file)
  }

  return (
    <div
      className={`no-print border-2 border-dashed rounded-lg text-center transition ${
        compact ? 'p-3' : 'p-8'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
      }`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <p className="text-gray-600 text-sm">
        {multiple ? 'Drag and drop PDFs here, or ' : 'Drag and drop a PDF here, or '}
        <span className="text-blue-600 underline">click to browse</span>
      </p>
      {compact ? null : <p className="text-xs text-gray-400 mt-1">PDF files only</p>}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          // Allow picking the same file again (e.g. after removing it).
          e.target.value = ''
        }}
      />
    </div>
  )
}
