import { useMemo, useState } from 'react'
import '../reportPrint.css'
import BackToHomeLink from '../components/BackToHomeLink'
import EntryEditor from '../components/EntryEditor'
import IncentiveReportPreview from '../components/IncentiveReportPreview'
import PdfNameDialog from '../components/PdfNameDialog'
import useUnsavedWarning from '../hooks/useUnsavedWarning'
import { downloadPdfBytes } from '../utils/pdfUtils'
import { buildIncentiveReportPdf } from '../utils/reportPdf'
import { slugify } from '../utils/fileName'
import {
  computeIncentiveTotals,
  createIncentiveEntry,
  formatMoney,
  isIncentiveDirty,
  todayISO,
  validateIncentiveReport,
} from '../utils/reportCalculations'

const COLUMNS = [
  { key: 'date', label: 'Date', type: 'date', width: '140px' },
  { key: 'patientName', label: 'Patient Name', type: 'text', width: 'minmax(140px, 1.2fr)' },
  { key: 'testName', label: 'Test(s)', type: 'text', width: 'minmax(180px, 2fr)', placeholder: 'e.g. CBC, LFT, LIPID' },
  { key: 'payment', label: 'Payment (₹)', type: 'amount', width: '110px', placeholder: '0.00' },
  { key: 'incentive', label: 'Incentive (₹)', type: 'amount', width: '110px', placeholder: '0.00' },
]

const inputClass =
  'w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  )
}

function initialReport() {
  const today = todayISO()
  return {
    doctorName: '',
    reportDate: today,
    periodStart: '',
    periodEnd: '',
    entries: [createIncentiveEntry(today)],
  }
}

export default function DoctorIncentiveReport() {
  const [report, setReport] = useState(initialReport)
  const [showErrors, setShowErrors] = useState(false)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const validation = useMemo(() => validateIncentiveReport(report), [report])
  const totals = useMemo(() => computeIncentiveTotals(report.entries), [report.entries])
  const dirty = isIncentiveDirty(report)
  useUnsavedWarning(dirty)

  const fieldErrors = showErrors ? validation.fields : {}
  const entryErrors = showErrors ? validation.entries : {}

  const setField = (key) => (e) => setReport((prev) => ({ ...prev, [key]: e.target.value }))

  const addEntry = () =>
    setReport((prev) => {
      const last = prev.entries[prev.entries.length - 1]
      return { ...prev, entries: [...prev.entries, createIncentiveEntry(last?.date || prev.reportDate)] }
    })

  // Both actions check the form first and stop with clear messages if something is missing.
  const checkBeforeOutput = () => {
    setShowErrors(true)
    setDownloadError('')
    if (validation.hasErrors) {
      document.getElementById('report-validation-banner')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  const handlePrint = () => {
    if (checkBeforeOutput()) window.print()
  }

  const handleDownloadClick = () => {
    if (downloading) return
    if (checkBeforeOutput()) setNameDialogOpen(true)
  }

  const handleDownload = async (fileName) => {
    setNameDialogOpen(false)
    setDownloading(true)
    try {
      const bytes = await buildIncentiveReportPdf(report)
      downloadPdfBytes(bytes, fileName)
    } catch (err) {
      console.error(err)
      setDownloadError('Something went wrong while generating the PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const defaultFileName = `incentive-report-${slugify(report.doctorName) || 'doctor'}-${
    report.periodEnd || report.reportDate || todayISO()
  }`

  return (
    <div className="report-layout-reset min-h-screen bg-gray-100 py-6 px-4">
      <div className="report-layout-reset max-w-5xl mx-auto">
        <div className="no-print space-y-4">
          <div>
            <BackToHomeLink isDirty={dirty} />
            <h1 className="text-xl font-bold text-gray-800">Doctor Incentive Report</h1>
            <p className="text-sm text-gray-500">
              Enter the doctor, reporting period and patient entries. The report below updates live.
              Nothing is saved automatically — print or download the report before leaving.
            </p>
          </div>

          {showErrors && validation.hasErrors ? (
            <div
              id="report-validation-banner"
              className="border border-red-300 bg-red-50 text-red-700 text-sm rounded px-3 py-2"
            >
              Please fix the highlighted fields before printing or downloading.
              {validation.general.map((m) => (
                <div key={m}>{m}</div>
              ))}
            </div>
          ) : null}
          {downloadError ? (
            <div className="border border-red-300 bg-red-50 text-red-700 text-sm rounded px-3 py-2">{downloadError}</div>
          ) : null}

          <div className="bg-white rounded-lg shadow-sm p-5 space-y-5">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Doctor Name *" error={fieldErrors.doctorName}>
                <input
                  className={`${inputClass} ${fieldErrors.doctorName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  value={report.doctorName}
                  onChange={setField('doctorName')}
                />
              </Field>
              <Field label="Report Date *" error={fieldErrors.reportDate}>
                <input
                  type="date"
                  className={`${inputClass} ${fieldErrors.reportDate ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  value={report.reportDate}
                  onChange={setField('reportDate')}
                />
              </Field>
              <Field label="Period Start *" error={fieldErrors.periodStart}>
                <input
                  type="date"
                  className={`${inputClass} ${fieldErrors.periodStart ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  value={report.periodStart}
                  onChange={setField('periodStart')}
                />
              </Field>
              <Field label="Period End *" error={fieldErrors.periodEnd}>
                <input
                  type="date"
                  className={`${inputClass} ${fieldErrors.periodEnd ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  value={report.periodEnd}
                  onChange={setField('periodEnd')}
                />
              </Field>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Patient &amp; Test Entries</h2>
              <EntryEditor
                columns={COLUMNS}
                entries={report.entries}
                errors={entryErrors}
                onChange={(entries) => setReport((prev) => ({ ...prev, entries }))}
                onAdd={addEntry}
              />
            </section>

            <section className="border-t border-gray-200 pt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm space-y-0.5">
                <div>
                  <span className="text-gray-600">Total Payment: </span>
                  <span className="font-semibold">{formatMoney(totals.totalPayment)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Incentive: </span>
                  <span className="font-semibold">{formatMoney(totals.totalIncentive)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  disabled={downloading}
                  className="text-sm font-medium border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  {downloading ? 'Building PDF…' : '⬇ Download PDF'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-sm font-semibold bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  🖨️ Print Report
                </button>
              </div>
            </section>
          </div>
        </div>

        <section className="report-layout-reset mt-6">
          <h2 className="no-print text-sm font-semibold text-gray-700 mb-2">Live report preview</h2>
          <div className="report-layout-reset overflow-x-auto">
            <IncentiveReportPreview report={report} />
          </div>
        </section>
      </div>

      <PdfNameDialog
        open={nameDialogOpen}
        defaultName={defaultFileName}
        onConfirm={handleDownload}
        onCancel={() => setNameDialogOpen(false)}
      />
    </div>
  )
}
