import ReportHeader from './ReportHeader'
import {
  computeIncentiveTotals,
  formatAmountCell,
  formatDisplayDate,
  formatMoney,
} from '../utils/reportCalculations'

const cell = 'border-b border-gray-300 py-1.5 px-2 align-top break-words'

export default function IncentiveReportPreview({ report }) {
  const { totalPayment, totalIncentive } = computeIncentiveTotals(report.entries)
  const period =
    report.periodStart || report.periodEnd
      ? `${formatDisplayDate(report.periodStart) || '—'} to ${formatDisplayDate(report.periodEnd) || '—'}`
      : '—'

  return (
    <div id="report-print-area" className="report-layout-reset report-document">
      <section className="report-sheet bg-white border border-gray-300 shadow-sm mx-auto p-8 max-w-[210mm]">
        <ReportHeader title="Doctor Incentive Report" />

        <div className="report-meta-block text-sm mt-3 space-y-0.5">
          <div>
            <span className="font-semibold">Doctor Name: </span>
            {report.doctorName || '—'}
          </div>
          <div>
            <span className="font-semibold">Report Date: </span>
            {formatDisplayDate(report.reportDate) || '—'}
          </div>
          <div>
            <span className="font-semibold">Reporting Period: </span>
            {period}
          </div>
        </div>

        <table className="report-table w-full table-fixed text-xs border-collapse mt-3">
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '22%' }} />
            <col />
            <col style={{ width: '14%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr className="border-y border-black">
              <th className="text-left font-semibold py-1.5 px-2">Sr.</th>
              <th className="text-left font-semibold py-1.5 px-2">Date</th>
              <th className="text-left font-semibold py-1.5 px-2">Patient Name</th>
              <th className="text-left font-semibold py-1.5 px-2">Test</th>
              <th className="text-right font-semibold py-1.5 px-2">Payment (₹)</th>
              <th className="text-right font-semibold py-1.5 px-2">Incentive (₹)</th>
            </tr>
          </thead>
          <tbody>
            {report.entries.map((e, i) => (
              <tr key={e.id}>
                <td className={cell}>{i + 1}</td>
                <td className={cell}>{formatDisplayDate(e.date)}</td>
                <td className={cell}>{e.patientName}</td>
                <td className={cell}>{e.testName}</td>
                <td className={`${cell} text-right whitespace-nowrap`}>{formatAmountCell(e.payment)}</td>
                <td className={`${cell} text-right whitespace-nowrap`}>{formatAmountCell(e.incentive)}</td>
              </tr>
            ))}
            {report.entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-3 text-center text-gray-500 italic">
                  No entries
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="report-total-block flex justify-end mt-4">
          <div className="w-72 border-t-2 border-black pt-1 text-sm font-bold space-y-1">
            <div className="flex justify-between">
              <span>Total Payment</span>
              <span>{formatMoney(totalPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Incentive</span>
              <span>{formatMoney(totalIncentive)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
