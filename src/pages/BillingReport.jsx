import { useMemo, useState } from 'react'
import '../reportPrint.css'
import BackToHomeLink from '../components/BackToHomeLink'
import BillingReportPreview from '../components/BillingReportPreview'
import EntryEditor from '../components/EntryEditor'
import PdfNameDialog from '../components/PdfNameDialog'
import useUnsavedWarning from '../hooks/useUnsavedWarning'
import { downloadPdfBytes } from '../utils/pdfUtils'
import { buildBillingReportPdf } from '../utils/reportPdf'
import {
  computeDoctorTotal,
  createBillingEntry,
  createDoctor,
  formatMoney,
  isBillingDirty,
  todayISO,
  validateBillingReport,
} from '../utils/reportCalculations'

const COLUMNS = [
  { key: 'date', label: 'Date', type: 'date', width: '140px' },
  { key: 'patientName', label: 'Patient Name', type: 'text', width: 'minmax(140px, 1.2fr)' },
  { key: 'testName', label: 'Test Name', type: 'text', width: 'minmax(180px, 2fr)', placeholder: 'e.g. CBC, WIDAL' },
  { key: 'amount', label: 'Amount (₹)', type: 'amount', width: '120px', placeholder: 'e.g. 130 or -50' },
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
  return { reportDate: today, periodStart: '', periodEnd: '', doctors: [createDoctor('', today)] }
}

export default function BillingReport() {
  const [report, setReport] = useState(initialReport)
  const [collapsed, setCollapsed] = useState({})
  const [showErrors, setShowErrors] = useState(false)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const validation = useMemo(() => validateBillingReport(report), [report])
  const dirty = isBillingDirty(report)
  useUnsavedWarning(dirty)

  const setField = (key) => (e) => setReport((prev) => ({ ...prev, [key]: e.target.value }))

  const updateDoctor = (id, patch) =>
    setReport((prev) => ({
      ...prev,
      doctors: prev.doctors.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }))

  const addDoctor = () =>
    setReport((prev) => ({ ...prev, doctors: [...prev.doctors, createDoctor('', prev.reportDate)] }))

  const removeDoctor = (doctor) => {
    const count = doctor.entries.length
    const ok = window.confirm(
      `Remove ${doctor.name.trim() || 'this doctor'} and ${count} ${count === 1 ? 'entry' : 'entries'}?\n\nThis cannot be undone.`,
    )
    if (!ok) return
    setReport((prev) => ({ ...prev, doctors: prev.doctors.filter((d) => d.id !== doctor.id) }))
  }

  const addEntry = (doctor) => {
    const last = doctor.entries[doctor.entries.length - 1]
    updateDoctor(doctor.id, {
      entries: [...doctor.entries, createBillingEntry(last?.date || report.reportDate)],
    })
  }

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
      const bytes = await buildBillingReportPdf(report)
      downloadPdfBytes(bytes, fileName)
    } catch (err) {
      console.error(err)
      setDownloadError('Something went wrong while generating the PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const defaultFileName = `billing-report-${report.periodEnd || report.reportDate || todayISO()}`
  const doctorErrors = showErrors ? validation.doctors : {}

  return (
    <div className="report-layout-reset min-h-screen bg-gray-100 py-6 px-4">
      <div className="report-layout-reset max-w-5xl mx-auto">
        <div className="no-print space-y-4">
          <div>
            <BackToHomeLink isDirty={dirty} />
            <h1 className="text-xl font-bold text-gray-800">Billing Report</h1>
            <p className="text-sm text-gray-500">
              Add one or more doctors, each with their own billing entries. Negative amounts (refunds,
              adjustments) are allowed. When printed, every doctor&apos;s report starts on a new page.
              Nothing is saved automatically — print or download before leaving.
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

          {/* Session details */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Report Date">
                <input type="date" className={`${inputClass} border-gray-300`} value={report.reportDate} onChange={setField('reportDate')} />
              </Field>
              <Field label="Period From (optional)">
                <input type="date" className={`${inputClass} border-gray-300`} value={report.periodStart} onChange={setField('periodStart')} />
              </Field>
              <Field label="Period To (optional)">
                <input type="date" className={`${inputClass} border-gray-300`} value={report.periodEnd} onChange={setField('periodEnd')} />
              </Field>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              The report&apos;s Date line shows the period when both period dates are set; otherwise the report date.
            </p>
          </div>

          {/* One card per doctor */}
          {report.doctors.map((doctor, index) => {
            const total = computeDoctorTotal(doctor)
            const errs = doctorErrors[doctor.id] || { entries: {} }
            const isCollapsed = !!collapsed[doctor.id]
            return (
              <div key={doctor.id} className="bg-white rounded-lg shadow-sm p-5 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <Field label={`Doctor / Client Name * (Doctor ${index + 1})`} error={errs.name}>
                      <input
                        className={`${inputClass} ${errs.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                        value={doctor.name}
                        onChange={(e) => updateDoctor(doctor.id, { name: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="text-sm pb-1.5">
                    <span className="text-gray-600">Total: </span>
                    <span className={`font-semibold ${total < 0 ? 'text-red-600' : ''}`}>{formatMoney(total)}</span>
                    <span className="text-xs text-gray-400"> ({doctor.entries.length} {doctor.entries.length === 1 ? 'entry' : 'entries'})</span>
                  </div>
                  <div className="flex gap-2 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setCollapsed((c) => ({ ...c, [doctor.id]: !c[doctor.id] }))}
                      className="text-xs font-medium border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50"
                    >
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDoctor(doctor)}
                      className="text-xs font-medium border border-red-300 text-red-700 px-3 py-1.5 rounded hover:bg-red-50"
                    >
                      Remove Doctor
                    </button>
                  </div>
                </div>

                {errs.noEntries ? <p className="text-xs text-red-600">{errs.noEntries}</p> : null}

                {isCollapsed ? null : (
                  <>
                    <EntryEditor
                      columns={COLUMNS}
                      entries={doctor.entries}
                      errors={errs.entries}
                      onChange={(entries) => updateDoctor(doctor.id, { entries })}
                      onAdd={() => addEntry(doctor)}
                    />
                    <div className="border-t border-gray-200 pt-2 text-sm text-right">
                      <span className="text-gray-600">Doctor total: </span>
                      <span className={`font-semibold ${total < 0 ? 'text-red-600' : ''}`}>{formatMoney(total)}</span>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {report.doctors.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No doctors yet. Add one to start.</p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={addDoctor}
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + Add Doctor
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadClick}
                disabled={downloading}
                className="text-sm font-medium border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-40"
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
          </div>

          {/* Summary: on-screen only, each doctor still prints separately */}
          {report.doctors.length > 1 ? (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Doctor totals (not printed)</h2>
              <ul className="text-sm divide-y divide-gray-100">
                {report.doctors.map((d) => {
                  const t = computeDoctorTotal(d)
                  return (
                    <li key={d.id} className="flex justify-between py-1">
                      <span>{d.name.trim() || '(unnamed doctor)'}</span>
                      <span className={`font-medium ${t < 0 ? 'text-red-600' : ''}`}>{formatMoney(t)}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <section className="report-layout-reset mt-6">
          <h2 className="no-print text-sm font-semibold text-gray-700 mb-2">Print preview</h2>
          <div className="report-layout-reset overflow-x-auto">
            <BillingReportPreview report={report} />
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
