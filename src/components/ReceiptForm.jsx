import PatientDetails from './PatientDetails'
import TestList from './TestList'
import { formatCurrency } from '../utils/formatCurrency'

const inputClass =
  'w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
const labelClass = 'text-xs font-medium text-gray-600 mb-1 block'

export default function ReceiptForm({
  data,
  onChange,
  errors,
  total,
  payable,
  receivedValue,
  onReceivedEdit,
}) {
  const setField = (field) => (value) => onChange({ ...data, [field]: value })

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Patient & Receipt Details</h2>
        <PatientDetails
          data={data}
          errors={errors}
          onChange={(next) => onChange(next)}
        />
      </section>

      <section>
        <TestList
          tests={data.tests}
          errors={errors}
          onChange={(tests) => onChange({ ...data, tests })}
        />
      </section>

      <section className="border-t border-gray-200 pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total</span>
          <span className="font-semibold">₹ {formatCurrency(total)}</span>
        </div>

        <div>
          <label className={labelClass}>Discount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={data.discount}
            onChange={(e) => setField('discount')(e.target.value)}
          />
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Payable (Total − Discount)</span>
          <span className="font-semibold">₹ {formatCurrency(payable)}</span>
        </div>

        <div>
          <label className={labelClass}>Received (auto-fills with payable amount; editable)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={receivedValue}
            onChange={(e) => onReceivedEdit(e.target.value)}
          />
        </div>
      </section>
    </div>
  )
}
