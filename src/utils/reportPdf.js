import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { LAB_CONFIG } from '../labConfig'
import {
  computeDoctorTotal,
  computeIncentiveTotals,
  formatAmountCell,
  formatDisplayDate,
  formatMoneyPlain,
  reportDateLabel,
} from './reportCalculations'

/*
 * Builds downloadable report PDFs entirely in the browser with pdf-lib.
 *
 * Standard PDF fonts cannot draw the rupee sign or non-Latin letters, so the
 * rupee sign is written as "Rs." and any character the font cannot encode is
 * replaced with "?".
 */

const PAGE_W = 595.28 // A4
const PAGE_H = 841.89
const MARGIN = { top: 40, bottom: 50, left: 40, right: 40 }
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right
const BLACK = rgb(0, 0, 0)
const GREY = rgb(0.4, 0.4, 0.4)
const LIGHT = rgb(0.8, 0.8, 0.8)

const FONT_SIZE = 9.5
const LINE_H = 12.5
const PAD_X = 4
const PAD_Y = 4

async function createContext() {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  return { doc, regular, bold, encodable: new Map() }
}

function canEncode(ctx, font, ch) {
  const key = `${font === ctx.bold ? 'b' : 'r'}${ch}`
  if (!ctx.encodable.has(key)) {
    let ok = true
    try {
      font.encodeText(ch)
    } catch {
      ok = false
    }
    ctx.encodable.set(key, ok)
  }
  return ctx.encodable.get(key)
}

/** Single-line, font-safe text. */
function safeText(ctx, font, text) {
  let out = ''
  for (const ch of String(text ?? '').replace(/₹/g, 'Rs. ')) {
    if (ch === '\n' || ch === '\r' || ch === '\t') out += ' '
    else out += canEncode(ctx, font, ch) ? ch : '?'
  }
  return out
}

function wrapLines(font, size, text, maxWidth) {
  const lines = []
  let current = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) {
      lines.push(current)
      current = ''
    }
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      current = word
      continue
    }
    // A single very long word: split it by characters.
    let chunk = ''
    for (const ch of word) {
      if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
        lines.push(chunk)
        chunk = ch
      } else {
        chunk += ch
      }
    }
    current = chunk
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

/* ------------------------------ Page writer ------------------------------- */

/** Tracks the current page/y position of one report section (e.g. one doctor). */
function createSection(ctx, continuationLabel) {
  const section = { pages: [], page: null, y: 0 }

  section.newPage = (isContinuation) => {
    section.page = ctx.doc.addPage([PAGE_W, PAGE_H])
    section.pages.push(section.page)
    section.y = PAGE_H - MARGIN.top
    if (isContinuation) {
      const label = safeText(ctx, ctx.bold, `${LAB_CONFIG.name} - ${continuationLabel} (continued)`)
      section.page.drawText(label, { x: MARGIN.left, y: section.y - 9, size: 9, font: ctx.bold, color: GREY })
      section.y -= 24
    }
  }

  /** Starts a new page when `height` does not fit. Returns true if it did. */
  section.ensure = (height) => {
    if (section.y - height < MARGIN.bottom) {
      section.newPage(true)
      return true
    }
    return false
  }

  section.newPage(false)
  return section
}

function drawCentered(ctx, section, text, font, size, color = BLACK) {
  const safe = safeText(ctx, font, text)
  const lines = wrapLines(font, size, safe, CONTENT_W)
  for (const line of lines) {
    const w = font.widthOfTextAtSize(line, size)
    section.page.drawText(line, { x: (PAGE_W - w) / 2, y: section.y - size, size, font, color })
    section.y -= size + 3
  }
}

function drawLabHeader(ctx, section, title) {
  drawCentered(ctx, section, LAB_CONFIG.name, ctx.bold, 16)
  section.y -= 2
  drawCentered(ctx, section, `Address: ${LAB_CONFIG.address}`, ctx.regular, 9)
  drawCentered(ctx, section, `Contact: ${LAB_CONFIG.phone}`, ctx.regular, 9)
  section.y -= 4
  section.page.drawLine({
    start: { x: MARGIN.left, y: section.y },
    end: { x: PAGE_W - MARGIN.right, y: section.y },
    thickness: 1,
    color: BLACK,
  })
  section.y -= 10
  drawCentered(ctx, section, title, ctx.bold, 13)
  section.y -= 6
}

function drawLabelValue(ctx, section, label, value) {
  const size = 10.5
  const labelText = safeText(ctx, ctx.bold, `${label}: `)
  const labelW = ctx.bold.widthOfTextAtSize(labelText, size)
  section.page.drawText(labelText, { x: MARGIN.left, y: section.y - size, size, font: ctx.bold, color: BLACK })
  const lines = wrapLines(ctx.regular, size, safeText(ctx, ctx.regular, value), CONTENT_W - labelW)
  lines.forEach((line, i) => {
    section.page.drawText(line, { x: MARGIN.left + labelW, y: section.y - size - i * 13, size, font: ctx.regular, color: BLACK })
  })
  section.y -= lines.length * 13 + 2
}

/* --------------------------------- Table ---------------------------------- */

function columnX(columns) {
  let x = MARGIN.left
  return columns.map((c) => {
    const start = x
    x += c.width
    return start
  })
}

function drawTableHeader(ctx, section, columns) {
  const xs = columnX(columns)
  const h = LINE_H + PAD_Y * 2
  section.page.drawLine({ start: { x: MARGIN.left, y: section.y }, end: { x: PAGE_W - MARGIN.right, y: section.y }, thickness: 1, color: BLACK })
  columns.forEach((c, i) => {
    const text = safeText(ctx, ctx.bold, c.header)
    const w = ctx.bold.widthOfTextAtSize(text, FONT_SIZE)
    const x = c.align === 'right' ? xs[i] + c.width - PAD_X - w : xs[i] + PAD_X
    section.page.drawText(text, { x, y: section.y - PAD_Y - FONT_SIZE, size: FONT_SIZE, font: ctx.bold, color: BLACK })
  })
  section.y -= h
  section.page.drawLine({ start: { x: MARGIN.left, y: section.y }, end: { x: PAGE_W - MARGIN.right, y: section.y }, thickness: 1, color: BLACK })
}

/** Draws all rows, starting a new page (with repeated header) when needed. */
function drawTable(ctx, section, columns, rows) {
  const xs = columnX(columns)
  const headerH = LINE_H + PAD_Y * 2

  // Make sure the header and at least the first row fit together.
  section.ensure(headerH + LINE_H + PAD_Y * 2)
  drawTableHeader(ctx, section, columns)

  for (const cells of rows) {
    const wrapped = cells.map((cell, i) =>
      wrapLines(ctx.regular, FONT_SIZE, safeText(ctx, ctx.regular, cell), columns[i].width - PAD_X * 2),
    )
    const rowH = Math.max(...wrapped.map((l) => l.length)) * LINE_H + PAD_Y * 2

    // Rows are never cut across pages; the header is repeated on the new page.
    if (section.ensure(rowH)) drawTableHeader(ctx, section, columns)

    wrapped.forEach((lines, i) => {
      lines.forEach((line, li) => {
        const w = ctx.regular.widthOfTextAtSize(line, FONT_SIZE)
        const x = columns[i].align === 'right' ? xs[i] + columns[i].width - PAD_X - w : xs[i] + PAD_X
        section.page.drawText(line, { x, y: section.y - PAD_Y - FONT_SIZE - li * LINE_H, size: FONT_SIZE, font: ctx.regular, color: BLACK })
      })
    })
    section.y -= rowH
    section.page.drawLine({ start: { x: MARGIN.left, y: section.y }, end: { x: PAGE_W - MARGIN.right, y: section.y }, thickness: 0.5, color: LIGHT })
  }
}

/** Right-aligned "Label: value" lines under the table (drawn once, at the end). */
function drawTotals(ctx, section, lines) {
  const h = lines.length * 18 + 14
  section.ensure(h)
  section.y -= 10
  section.page.drawLine({ start: { x: PAGE_W - MARGIN.right - 230, y: section.y }, end: { x: PAGE_W - MARGIN.right, y: section.y }, thickness: 1.5, color: BLACK })
  section.y -= 4
  for (const { label, value } of lines) {
    const size = 11
    const valueText = safeText(ctx, ctx.bold, value)
    const vw = ctx.bold.widthOfTextAtSize(valueText, size)
    section.page.drawText(safeText(ctx, ctx.bold, label), { x: PAGE_W - MARGIN.right - 230, y: section.y - size, size, font: ctx.bold, color: BLACK })
    section.page.drawText(valueText, { x: PAGE_W - MARGIN.right - vw, y: section.y - size, size, font: ctx.bold, color: BLACK })
    section.y -= 18
  }
}

function drawFooters(ctx, sections) {
  for (const section of sections) {
    const total = section.pages.length
    section.pages.forEach((page, i) => {
      const text = `Page ${i + 1} of ${total}`
      const w = ctx.regular.widthOfTextAtSize(text, 8)
      page.drawText(text, { x: (PAGE_W - w) / 2, y: 28, size: 8, font: ctx.regular, color: GREY })
    })
  }
}

/* ------------------------------ Public builders --------------------------- */

const BILLING_COLUMNS = [
  { header: 'Date', width: 68 },
  { header: 'Patient Name', width: 150 },
  { header: 'Test Name', width: CONTENT_W - 68 - 150 - 90 },
  { header: 'Amount (Rs.)', width: 90, align: 'right' },
]

/** One PDF; every doctor's report starts on its own fresh page. */
export async function buildBillingReportPdf(report) {
  if (!report.doctors || report.doctors.length === 0) {
    throw new Error('Add at least one doctor before downloading.')
  }
  const ctx = await createContext()
  const dateText = reportDateLabel(report)
  const sections = []

  for (const doctor of report.doctors) {
    const label = `Billing Report - ${doctor.name}`
    const section = createSection(ctx, label)
    sections.push(section)

    drawLabHeader(ctx, section, 'Billing Report')
    drawLabelValue(ctx, section, 'Client Name', doctor.name)
    drawLabelValue(ctx, section, 'Date', dateText)
    section.y -= 8

    const rows = doctor.entries.map((e) => [
      formatDisplayDate(e.date),
      e.patientName,
      e.testName,
      formatAmountCell(e.amount),
    ])
    drawTable(ctx, section, BILLING_COLUMNS, rows)
    drawTotals(ctx, section, [{ label: 'Total', value: formatMoneyPlain(computeDoctorTotal(doctor)) }])
  }

  drawFooters(ctx, sections)
  ctx.doc.setTitle('Billing Report')
  return ctx.doc.save()
}

const INCENTIVE_COLUMNS = [
  { header: 'Sr.', width: 26 },
  { header: 'Date', width: 62 },
  { header: 'Patient Name', width: 120 },
  { header: 'Test', width: CONTENT_W - 26 - 62 - 120 - 72 - 72 },
  { header: 'Payment', width: 72, align: 'right' },
  { header: 'Incentive', width: 72, align: 'right' },
]

export async function buildIncentiveReportPdf(report) {
  const ctx = await createContext()
  const section = createSection(ctx, `Doctor Incentive Report - ${report.doctorName}`)

  drawLabHeader(ctx, section, 'Doctor Incentive Report')
  drawLabelValue(ctx, section, 'Doctor Name', report.doctorName)
  drawLabelValue(ctx, section, 'Report Date', formatDisplayDate(report.reportDate))
  drawLabelValue(
    ctx,
    section,
    'Reporting Period',
    `${formatDisplayDate(report.periodStart)} to ${formatDisplayDate(report.periodEnd)}`,
  )
  section.y -= 8

  const rows = report.entries.map((e, i) => [
    String(i + 1),
    formatDisplayDate(e.date),
    e.patientName,
    e.testName,
    formatAmountCell(e.payment),
    formatAmountCell(e.incentive),
  ])
  drawTable(ctx, section, INCENTIVE_COLUMNS, rows)

  const { totalPayment, totalIncentive } = computeIncentiveTotals(report.entries)
  drawTotals(ctx, section, [
    { label: 'Total Payment', value: formatMoneyPlain(totalPayment) },
    { label: 'Total Incentive', value: formatMoneyPlain(totalIncentive) },
  ])

  drawFooters(ctx, [section])
  ctx.doc.setTitle('Doctor Incentive Report')
  return ctx.doc.save()
}

