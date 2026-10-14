import ReceiptHeader from './ReceiptHeader'
import ReceiptTable from './ReceiptTable'
import ReceiptSummary from './ReceiptSummary'

function formatDisplayDate(isoDate) {
  if (!isoDate) return '—'
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}-${month}-${year}`
}

export default function ReceiptPreview({ data, total, received }) {
  const {
    receiptNo,
    patientId,
    date,
    name,
    age,
    sex,
    refDr,
    paymentMode,
    tests,
    discount,
  } = data

  return (
    <div
      id="receipt-print-area"
      className="receipt-document mx-auto border border-black p-6 text-black"
      style={{ width: '210mm', minHeight: '148mm', maxWidth: '100%' }}
    >
      <ReceiptHeader receiptNo={receiptNo} />

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-2">
        <div>
          <span className="font-semibold">Patient ID: </span>
          {patientId || '—'}
        </div>
        <div>
          <span className="font-semibold">Date: </span>
          {formatDisplayDate(date)}
        </div>
        <div>
          <span className="font-semibold">Name: </span>
          {name || '—'}
        </div>
        <div>
          <span className="font-semibold">Age/Sex: </span>
          {age ? `${age} Years` : '—'}/{sex || '—'}
        </div>
        <div>
          <span className="font-semibold">Ref Dr.: </span>
          {refDr || '—'}
        </div>
      </div>

      <ReceiptTable tests={tests} />

      <ReceiptSummary
        total={total}
        discount={Number(discount) || 0}
        received={received}
        paymentMode={paymentMode}
      />
    </div>
  )
}
