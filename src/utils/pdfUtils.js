import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
// Vite-specific "?url" import: resolves to the worker file's final built URL
// so pdf.js can load it, without us having to host it separately.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

/** True if the given File looks like a PDF (by MIME type or extension). */
export function isPdfFile(file) {
  if (!file) return false
  if (file.type === 'application/pdf') return true
  return /\.pdf$/i.test(file.name || '')
}

/** Reads a File into a Uint8Array. Does not mutate or upload anything. */
export async function readFileAsBytes(file) {
  const buffer = await file.arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * Renders every page of a PDF (given as bytes) to a PNG data URL thumbnail.
 * Returns an array of { originalIndex (0-based), pageNumber (1-based), dataUrl }.
 * Throws if the PDF is corrupted, empty, or unreadable.
 */
export async function renderPageThumbnails(bytes, scale = 0.35, onProgress) {
  // pdf.js can detach/transfer the buffer it's given, so hand it a copy —
  // the caller's original bytes are reused later for pdf-lib operations.
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() })
  const pdf = await loadingTask.promise

  if (pdf.numPages === 0) {
    throw new Error('This PDF has no pages.')
  }

  const thumbnails = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')

    await page.render({ canvasContext: context, viewport }).promise

    thumbnails.push({
      originalIndex: pageNumber - 1,
      pageNumber,
      dataUrl: canvas.toDataURL('image/png'),
    })
    onProgress?.(pageNumber, pdf.numPages)
  }

  return thumbnails
}

/**
 * Builds a new PDF (as Uint8Array) containing only the given 0-based page
 * indices from the source PDF, in the exact order supplied. Used for both
 * reordering (any order) and deleting (ascending order, some indices
 * omitted).
 */
export async function extractPages(bytes, indices) {
  if (!indices || indices.length === 0) {
    throw new Error('At least one page must remain in the PDF.')
  }

  const srcDoc = await PDFDocument.load(bytes)
  const newDoc = await PDFDocument.create()
  const copiedPages = await newDoc.copyPages(srcDoc, indices)
  copiedPages.forEach((page) => newDoc.addPage(page))
  return newDoc.save()
}

/** Reorders pages: `order` is the full list of original indices, new sequence. */
export async function buildReorderedPdf(bytes, order) {
  return extractPages(bytes, order)
}

/** Removes the given 0-based indices, keeping the rest in original order. */
export async function buildPdfWithPagesRemoved(bytes, indicesToRemove) {
  const srcDoc = await PDFDocument.load(bytes)
  const total = srcDoc.getPageCount()
  const removeSet = new Set(indicesToRemove)
  const keep = []
  for (let i = 0; i < total; i += 1) {
    if (!removeSet.has(i)) keep.push(i)
  }
  return extractPages(bytes, keep)
}

/** Triggers a browser download of the given PDF bytes under `filename`. */
export function downloadPdfBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Validates that pdf-lib can open the bytes (the same library used to build
 * the final document) and returns basic info. Throws for corrupted,
 * encrypted/password-protected, or empty PDFs.
 */
export async function getPdfInfo(bytes) {
  const doc = await PDFDocument.load(bytes)
  const pageCount = doc.getPageCount()
  if (pageCount === 0) {
    throw new Error('This PDF has no pages.')
  }
  return { pageCount }
}

/** Turns a PDF loading error into a short, user-friendly message. */
export function describePdfError(err) {
  const message = String(err?.message || '')
  if (err?.name === 'PasswordException' || /encrypted|password/i.test(message)) {
    return 'This PDF is password-protected or encrypted and cannot be opened.'
  }
  if (/no pages/i.test(message)) {
    return 'This PDF is empty (it has no pages).'
  }
  return 'This PDF could not be read. It may be corrupted.'
}
