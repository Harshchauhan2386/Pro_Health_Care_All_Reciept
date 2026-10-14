/** Turns free text into a safe, lowercase slug for default file names. */
export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Cleans a user-typed PDF name and makes sure it ends in ".pdf".
 * Returns '' if nothing usable is left (so callers can ask again).
 */
export function sanitizeFileName(raw) {
  let name = String(raw ?? '')
  name = name.replace(/[\u0000-\u001f\u007f]/g, '') // control characters
  name = name.replace(/[<>:"/\\|?*]/g, '-') // characters not allowed in file names
  name = name.replace(/\s+/g, ' ').trim()
  name = name.replace(/(\.pdf)+$/i, '') // the extension is added below
  name = name.replace(/^[.\s]+|[.\s]+$/g, '')
  if (name.length > 120) name = name.slice(0, 120).trim()
  if (!name) return ''
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(name)) name = `${name}-file`
  return `${name}.pdf`
}
