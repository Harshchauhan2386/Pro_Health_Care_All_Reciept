import { formatCurrency } from './formatCurrency'

/*
 * Pure calculation / validation helpers shared by the Doctor Incentive Report
 * and the Billing Report. No React or browser APIs in here, so it can be
 * tested on its own.
 *
 * Amounts are typed as strings in the forms. Negative values and zero are
 * valid and are NEVER converted or clamped. Sums are done in integer paise to
 * avoid floating point errors (0.1 + 0.2 etc.).
 */

let idCounter = 0
export function createId(prefix = 'id') {
  idCounter += 1
  return `${prefix}${Date.now().toString(36)}${idCounter}`
}

/** Strict amount parser. Returns a number, or null if the text is not a valid amount. */
export function parseAmount(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null
  const cleaned = String(text ?? '')
    .trim()
    .replace(/\u2212/g, '-') // typographic minus pasted from other apps
  if (!/^[+-]?(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(cleaned)) return null
  return Number(cleaned)
}

export function toPaise(value) {
  return Math.round(value * 100)
}

/** Sum of a list of amount strings/numbers (invalid or empty values count as 0). Keeps the sign. */
export function sumAmounts(values) {
  let paise = 0
  for (const v of values) {
    const n = parseAmount(v)
    if (n !== null) paise += toPaise(n)
  }
  const total = paise / 100
  return total === 0 ? 0 : total // normalise -0
}

/** "1,250.00" / "-50.00" (no currency symbol), or '' if the text is not a valid amount. */
export function formatAmountCell(text) {
  const n = parseAmount(text)
  if (n === null) return ''
  return formatCurrency(n === 0 ? 0 : n)
}

/** "₹1,250.00" / "-₹50.00". The minus sign always comes first. */
export function formatMoney(value) {
  const safe = Number.isFinite(value) ? value : 0
  const negative = toPaise(safe) < 0
  return `${negative ? '-' : ''}₹${formatCurrency(Math.abs(safe))}`
}

/** PDF-safe version (standard PDF fonts cannot draw the rupee sign): "-Rs. 50.00". */
export function formatMoneyPlain(value) {
  return formatMoney(value).replace('₹', 'Rs. ')
}

/** 2026-08-30 -> 30/08/2026 (leaves anything else untouched). */
export function formatDisplayDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || ''
}

export function todayISO() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Text for the "Date" line of a billing report: the period if both ends are set, else the report date. */
export function reportDateLabel({ reportDate, periodStart, periodEnd }) {
  if (periodStart && periodEnd) {
    return `${formatDisplayDate(periodStart)} to ${formatDisplayDate(periodEnd)}`
  }
  return formatDisplayDate(reportDate)
}

/* --------------------------------- Entries -------------------------------- */

export const AMOUNT_ERROR = 'Enter a valid amount, e.g. 130, -50, 0 or 99.50'

export function createIncentiveEntry(date = '') {
  return { id: createId('i'), date, patientName: '', testName: '', payment: '', incentive: '' }
}

export function createBillingEntry(date = '') {
  return { id: createId('b'), date, patientName: '', testName: '', amount: '' }
}

export function createDoctor(name = '', date = '') {
  return { id: createId('d'), name, entries: [createBillingEntry(date)] }
}

function isBlankEntry(entry, keys) {
  return keys.every((k) => String(entry[k] ?? '').trim() === '')
}

export const INCENTIVE_KEYS = ['patientName', 'testName', 'payment', 'incentive']
export const BILLING_KEYS = ['patientName', 'testName', 'amount']

/* ------------------------------ Incentive report --------------------------- */

export function computeIncentiveTotals(entries) {
  return {
    totalPayment: sumAmounts(entries.map((e) => e.payment)),
    totalIncentive: sumAmounts(entries.map((e) => e.incentive)),
  }
}

export function isIncentiveDirty(report) {
  return (
    report.doctorName.trim() !== '' ||
    report.entries.some((e) => !isBlankEntry(e, INCENTIVE_KEYS))
  )
}

export function validateIncentiveReport(report) {
  const fields = {}
  const entries = {}
  const general = []

  if (!report.doctorName.trim()) fields.doctorName = 'Doctor name is required'
  if (!report.reportDate) fields.reportDate = 'Report date is required'
  if (!report.periodStart) fields.periodStart = 'Start date is required'
  if (!report.periodEnd) fields.periodEnd = 'End date is required'
  if (report.periodStart && report.periodEnd && report.periodStart > report.periodEnd) {
    fields.periodEnd = 'End date cannot be before the start date'
  }

  if (report.entries.length === 0) general.push('Add at least one entry.')

  for (const e of report.entries) {
    const err = {}
    if (!e.date) err.date = 'Date required'
    if (!e.patientName.trim()) err.patientName = 'Patient name required'
    if (!e.testName.trim()) err.testName = 'Test required'
    if (parseAmount(e.payment) === null) err.payment = AMOUNT_ERROR
    if (parseAmount(e.incentive) === null) err.incentive = AMOUNT_ERROR
    if (Object.keys(err).length) entries[e.id] = err
  }

  const hasErrors =
    Object.keys(fields).length > 0 || Object.keys(entries).length > 0 || general.length > 0
  return { fields, entries, general, hasErrors }
}

/* ------------------------------- Billing report ---------------------------- */

export function computeDoctorTotal(doctor) {
  return sumAmounts(doctor.entries.map((e) => e.amount))
}

export function isBillingDirty(report) {
  return report.doctors.some(
    (d) => d.name.trim() !== '' || d.entries.some((e) => !isBlankEntry(e, BILLING_KEYS)),
  )
}

export function validateBillingReport(report) {
  const doctors = {}
  const general = []

  if (!report.reportDate && !(report.periodStart && report.periodEnd)) {
    general.push('Enter a report date (or a complete reporting period).')
  }
  if (report.periodStart && report.periodEnd && report.periodStart > report.periodEnd) {
    general.push('The reporting period end date cannot be before the start date.')
  }
  if (report.doctors.length === 0) general.push('Add at least one doctor.')

  for (const d of report.doctors) {
    const err = { entries: {} }
    if (!d.name.trim()) err.name = 'Doctor / client name is required'
    if (d.entries.length === 0) err.noEntries = 'Add at least one entry, or remove this doctor.'
    for (const e of d.entries) {
      const ee = {}
      if (!e.date) ee.date = 'Date required'
      if (!e.patientName.trim()) ee.patientName = 'Patient name required'
      if (!e.testName.trim()) ee.testName = 'Test name required'
      // Any valid number is accepted: positive, negative or zero.
      if (parseAmount(e.amount) === null) ee.amount = AMOUNT_ERROR
      if (Object.keys(ee).length) err.entries[e.id] = ee
    }
    if (err.name || err.noEntries || Object.keys(err.entries).length) doctors[d.id] = err
  }

  const hasErrors = Object.keys(doctors).length > 0 || general.length > 0
  return { doctors, general, hasErrors }
}
