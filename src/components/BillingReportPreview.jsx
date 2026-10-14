import ReportHeader from './ReportHeader'
import {
  computeDoctorTotal,
  formatAmountCell,
  formatDisplayDate,
  formatMoney,
  reportDateLabel,
} from '../utils/reportCalculations'

const cell = 'border-b border-gray-300 py-1.5 px-2 align-top break-words'

/**
 * Print-ready preview: one .report-sheet per doctor. The print stylesheet
 * (reportPrint.css) starts every sheet after the first on a new page.
 */
export default function BillingReportPreview({ report }) {
  const dateText = reportDateLabel(report)

  return (
    <div id="report-print-area" className="report-layout-reset report-document">
      {report.doctors.map((doctor, index) => {
        const total = computeDoctorTotal(doctor)
        return (
          <section
            key={doctor.id}
            className="report-sheet bg-white border border-gray-300 shadow-sm mx-auto mb-6 p-8 max-w-[210mm]"
          >
            <p className="no-print text-right text-[11px] text-gray-400 -mt-4 mb-2">
              Report {index + 1} of {report.doctors.length} · prints on its own page
            </p>

            <ReportHeader title="Billing Report" />

            <div className="report-meta-block text-sm mt-3 space-y-0.5">
              <div>
                <span className="font-semibold">Client Name: </span>
                {doctor.name || '—'}
              </div>
              <div>
                <span className="font-semibold">Date: </span>
                {dateText || '—'}
              </div>
            </div>

            <table className="report-table w-full table-fixed text-xs border-collapse mt-3">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '25%' }} />
                <col />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr className="border-y border-black">
                  <th className="text-left font-semibold py-1.5 px-2">Date</th>
                  <th className="text-left font-semibold py-1.5 px-2">Patient Name</th>
                  <th className="text-left font-semibold py-1.5 px-2">Test Name</th>
                  <th className="text-right font-semibold py-1.5 px-2">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {doctor.entries.map((e) => (
                  <tr key={e.id}>
                    <td className={cell}>{formatDisplayDate(e.date)}</td>
                    <td className={cell}>{e.patientName}</td>
                    <td className={cell}>{e.testName}</td>
                    <td className={`${cell} text-right whitespace-nowrap`}>
                      {formatAmountCell(e.amount)}
                    </td>
                  </tr>
                ))}
                {doctor.entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-gray-500 italic">
                      No entries
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {/* Drawn once, after the last row (not as a repeating table footer). */}
            <div className="report-total-block flex justify-end mt-4">
              <div className="w-64 border-t-2 border-black pt-1 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
