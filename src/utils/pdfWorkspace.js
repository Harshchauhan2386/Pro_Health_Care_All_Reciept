import { PDFDocument } from 'pdf-lib'

/*
 * Workspace model used by the PDF Editor.
 *
 * files: [{ id, name, bytes, pageCount }]            (in merge order)
 * pages: [{ id, fileId, fileName, sourceIndex, ... }] (current final order)
 *
 * `bytes` are always the ORIGINAL uploaded bytes. The final PDF is built from
 * them every time, so reordering/deleting never degrades the document.
 */

/** Original combined sequence: file order, then page order inside each file. */
export function sortByOriginalOrder(pages, files) {
  const fileOrder = new Map(files.map((f, i) => [f.id, i]))
  return [...pages].sort(
    (a, b) =>
      fileOrder.get(a.fileId) - fileOrder.get(b.fileId) || a.sourceIndex - b.sourceIndex,
  )
}

/** Moves the page at `from` so it ends up at index `to`. */
export function movePage(pages, from, to) {
  if (from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) {
    return pages
  }
  const next = [...pages]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * Removes pages by id. Returns the remaining pages plus a record
 * ({ page, index }) of what was removed and where it was, for undo.
 */
export function removePages(pages, idsToRemove) {
  const removeSet = new Set(idsToRemove)
  const remaining = []
  const removed = []
  pages.forEach((page, index) => {
    if (removeSet.has(page.id)) removed.push({ page, index })
    else remaining.push(page)
  })
  return { remaining, removed }
}

/** Re-inserts previously removed pages at their previous positions. */
export function restorePages(pages, removedEntries) {
  const next = [...pages]
  const ordered = [...removedEntries].sort((a, b) => a.index - b.index)
  ordered.forEach(({ page, index }) => {
    next.splice(Math.min(index, next.length), 0, page)
  })
  return next
}

/**
 * Builds the final PDF by copying the ORIGINAL pages (not images) from the
 * source files, in exactly the order of `pages`. Page size, orientation and
 * content are preserved by pdf-lib's page copy.
 */
export async function buildFinalPdf(files, pages) {
  if (!pages || pages.length === 0) {
    throw new Error('At least one page must remain in the PDF.')
  }

  const bytesByFile = new Map(files.map((f) => [f.id, f.bytes]))

  // Collect which source pages are needed from each file.
  const neededByFile = new Map()
  for (const page of pages) {
    if (!bytesByFile.has(page.fileId)) {
      throw new Error('A source file for one of the pages is no longer in the workspace.')
    }
    if (!neededByFile.has(page.fileId)) neededByFile.set(page.fileId, [])
    neededByFile.get(page.fileId).push(page)
  }

  const output = await PDFDocument.create()

  // One copyPages call per source file keeps shared fonts/images from being
  // duplicated in the output.
  const copiedById = new Map()
  for (const [fileId, filePages] of neededByFile) {
    const source = await PDFDocument.load(bytesByFile.get(fileId))
    const copies = await output.copyPages(
      source,
      filePages.map((p) => p.sourceIndex),
    )
    copies.forEach((copy, i) => copiedById.set(filePages[i].id, copy))
  }

  for (const page of pages) {
    output.addPage(copiedById.get(page.id))
  }

  return output.save()
}
