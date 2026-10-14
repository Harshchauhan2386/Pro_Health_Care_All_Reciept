import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ReceiptForm from '../components/ReceiptForm'
import ReceiptPreview from '../components/ReceiptPreview'
import PrintButton from '../components/PrintButton'
import { createEmptyTest } from '../components/TestList'
import { LAB_CONFIG } from '../labConfig'

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function initialData() {
  return {
    receiptNo: '',
    patientId: '',
    date: todayISO(),
    name: '',
    age: '',
    sex: '',
    refDr: '',
    paymentMode: 'Cash',
    tests: [createEmptyTest()],
    discount: 0,
    received: 0,
  }
}

function validate(data, payable) {
  const errors = {}
  if (!data.patientId.trim()) errors.patientId = 'Patient ID is required'
  if (!data.name.trim()) errors.name = 'Patient name is required'
  if (!data.date) errors.date = 'Date is required'
  if (!data.paymentMode) errors.paymentMode = 'Payment mode is required'

  if (data.tests.length === 0) {
    errors.tests = 'At least one test/service is required'
  }

  const testItems = {}
  data.tests.forEach((t) => {
    const itemErrors = {}
    if (!t.name.trim()) itemErrors.name = 'Test name is required'
    const priceNum = Number(t.price)
    if (t.price === '' || Number.isNaN(priceNum) || priceNum <= 0) {
      itemErrors.price = 'Enter a valid positive price'
    }
    if (Object.keys(itemErrors).length > 0) testItems[t.id] = itemErrors
  })
  if (Object.keys(testItems).length > 0) errors.testItems = testItems

  return errors
}

export default function PaymentReceipt() {
  const [data, setData] = useState(initialData)
  const [receivedTouched, setReceivedTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const total = useMemo(
    () => data.tests.reduce((sum, t) => sum + (Number(t.price) || 0), 0),
    [data.tests],
  )
  const discountNum = Number(data.discount) || 0
  const payable = Math.max(total - discountNum, 0)

  // Auto-sync "received" to the payable amount unless the user has
  // manually edited it themselves.
  const received = receivedTouched ? Number(data.received) || 0 : payable

  const handleDataChange = (next) => {
    setData(next)
  }

  const handleReceivedEdit = (value) => {
    setReceivedTouched(true)
    setData((prev) => ({ ...prev, received: value }))
  }

  const errors = useMemo(() => validate(data, payable), [data, payable])
  const hasErrors = Object.keys(errors).length > 0

  const handlePrint = () => {
    setSubmitAttempted(true)
    if (hasErrors) {
      const firstError = document.getElementById('validation-banner')
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    window.print()
  }

  const previewData = { ...data, received }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/"
          className="no-print inline-block mb-3 text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Home
        </Link>

        <header className="no-print mb-6">
          <h1 className="text-xl font-bold text-gray-800">
            {LAB_CONFIG.name} — Payment Receipt Generator
          </h1>
          <p className="text-sm text-gray-500">
            Fill in patient and test details on the left. The receipt on the right updates live
            and is what gets printed.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form column */}
          <div className="no-print bg-white rounded-lg shadow-sm p-5">
            {submitAttempted && hasErrors ? (
              <div
                id="validation-banner"
                className="mb-4 border border-red-300 bg-red-50 text-red-700 text-sm rounded px-3 py-2"
              >
                Please fix the highlighted fields before printing.
              </div>
            ) : null}

            <ReceiptForm
              data={data}
              errors={submitAttempted ? errors : {}}
              onChange={handleDataChange}
              total={total}
              payable={payable}
              receivedValue={received}
              onReceivedEdit={handleReceivedEdit}
            />

            <div className="mt-6">
              <PrintButton onPrint={handlePrint} />
            </div>
          </div>

          {/* Preview column */}
          <div className="bg-white rounded-lg shadow-sm p-5 overflow-x-auto">
            <ReceiptPreview data={previewData} total={total} received={received} />
          </div>
        </div>
      </div>
    </div>
  )
}
